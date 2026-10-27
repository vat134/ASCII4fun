using System.Text;
using Ascii4Fun.Cli;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class ConvertImageCommandTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task WritesTheSamePngAsThePackage(bool sourceColors)
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-cli-png-");
        try
        {
            var encoded = ColorAndPngTests.CreateColorImage();
            var inputPath = Path.Combine(directory.FullName, "input.png");
            var outputPath = Path.Combine(directory.FullName, "output.png");
            await File.WriteAllBytesAsync(inputPath, encoded);
            using var input = new MemoryStream(encoded);
            var canvas = await new StillImageConverter().ConvertAsync(input, new CharacterImageOptions
            {
                OutputWidthInCells = 4,
                SourceColors = sourceColors
            });
            var args = new List<string> { "convert-image", inputPath, "--width", "4", "--format", "png", "--output", outputPath };
            if (sourceColors) args.Add("--source-colors");

            Assert.Equal(0, await CliApplication.RunAsync(args.ToArray()));
            using var expected = new MagickImage(await PngExporter.ExportAsync(canvas));
            using var actual = new MagickImage(await File.ReadAllBytesAsync(outputPath));
            using var expectedPixels = expected.GetPixels();
            using var actualPixels = actual.GetPixels();
            Assert.Equal(expectedPixels.ToByteArray(PixelMapping.RGB), actualPixels.ToByteArray(PixelMapping.RGB));
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task WritesEngineResultToUtf8File(bool sourceColors)
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-cli-");

        try
        {
            var inputPath = Path.Combine(directory.FullName, "input.png");
            var outputPath = Path.Combine(directory.FullName, "output.txt");
            await File.WriteAllBytesAsync(inputPath, CreateImage());

            var args = new List<string> { "convert-image", inputPath, "--width", "4", "--ramp", "@█", "--output", outputPath };
            if (sourceColors) args.Add("--source-colors");
            var exitCode = await CliApplication.RunAsync(args.ToArray());

            Assert.Equal(0, exitCode);
            Assert.Equal("@@██\n", await File.ReadAllTextAsync(outputPath));
            Assert.False((await File.ReadAllBytesAsync(outputPath)).AsSpan().StartsWith(Encoding.UTF8.Preamble));
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Fact]
    public async Task CreatesNumberedPngAndValidatesTheFormatBeforeConversion()
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-cli-png-");
        try
        {
            var inputPath = Path.Combine(directory.FullName, "photo.png");
            var outputDirectory = Directory.CreateDirectory(Path.Combine(directory.FullName, "output"));
            var existingOutput = Path.Combine(outputDirectory.FullName, "photo.png");
            await File.WriteAllBytesAsync(inputPath, CreateImage());
            await File.WriteAllTextAsync(existingOutput, "existing");
            Assert.Equal(1, await CliApplication.RunAsync(["convert-image", inputPath, "--format", "png"]));
            Assert.Equal(1, await CliApplication.RunAsync(["convert-image", inputPath, "--format", "invalid"]));
            Assert.Equal(0, await CliApplication.RunAsync([
                "convert-image", inputPath, "--format", "png", "--output-directory", outputDirectory.FullName]));
            Assert.Equal("existing", await File.ReadAllTextAsync(existingOutput));
            using var png = new MagickImage(await File.ReadAllBytesAsync(Path.Combine(outputDirectory.FullName, "photo-1.png")));
            Assert.Equal(MagickFormat.Png, png.Format);
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    [Fact]
    public async Task CreatesNumberedOutputWithoutOverwritingExistingFile()
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-cli-");

        try
        {
            var inputPath = Path.Combine(directory.FullName, "photo.png");
            var outputDirectory = Directory.CreateDirectory(Path.Combine(directory.FullName, "output"));
            var existingOutputPath = Path.Combine(outputDirectory.FullName, "photo.txt");
            var generatedOutputPath = Path.Combine(outputDirectory.FullName, "photo-1.txt");
            await File.WriteAllBytesAsync(inputPath, CreateImage());
            await File.WriteAllTextAsync(existingOutputPath, "existing");

            var exitCode = await CliApplication.RunAsync(
                [
                    "convert-image",
                    inputPath,
                    "--width",
                    "4",
                    "--ramp",
                    "@█",
                    "--output-directory",
                    outputDirectory.FullName
                ]);

            Assert.Equal(0, exitCode);
            Assert.Equal("existing", await File.ReadAllTextAsync(existingOutputPath));
            Assert.Equal("@@██\n", await File.ReadAllTextAsync(generatedOutputPath));
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }

    private static byte[] CreateImage()
    {
        const string portablePixmap = """
            P3
            4 2
            255
            0 0 0   0 0 0   255 255 255   255 255 255
            0 0 0   0 0 0   255 255 255   255 255 255
            """;

        using var image = new MagickImage(Encoding.ASCII.GetBytes(portablePixmap), MagickFormat.Ppm);
        return image.ToByteArray(MagickFormat.Png);
    }
}

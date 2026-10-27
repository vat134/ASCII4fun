using System.Text;
using Ascii4Fun.Cli;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class ConvertImageCommandTests
{
    [Fact]
    public async Task WritesEngineResultToUtf8File()
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-cli-");

        try
        {
            var inputPath = Path.Combine(directory.FullName, "input.png");
            var outputPath = Path.Combine(directory.FullName, "output.txt");
            await File.WriteAllBytesAsync(inputPath, CreateImage());

            var exitCode = await CliApplication.RunAsync(
                ["convert-image", inputPath, "--width", "4", "--ramp", "@█", "--output", outputPath]);

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

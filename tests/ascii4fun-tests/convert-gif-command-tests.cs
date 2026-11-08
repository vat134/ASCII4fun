using Ascii4Fun.Cli;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class ConvertGifCommandTests
{
    [Fact]
    public async Task ExportsRetimedGifAndSourceFrameWithoutOverwritingFiles()
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-gif-cli-");
        try
        {
            var source = Path.Combine(directory.FullName, "source.gif");
            var output = Path.Combine(directory.FullName, "output.gif");
            var png = Path.Combine(directory.FullName, "frame.png");
            await File.WriteAllBytesAsync(source, Convert.FromBase64String(
                "R0lGODlhBAAEAPAAAP8AAAAAACH/C05FVFNDQVBFMi4wAwECAAAh+QQEAwAAACwAAAAABAAEAAACBISPCQUAIfkEDAcAAAAsAQABAAIAAgCAAP8AAAAAAgKEUQAh+QQICwAAACwDAAMAAQABAIAAAP8AAAACAkQBADs="));
            Assert.Equal(0, await CliApplication.RunAsync(["convert-gif", source, "--output", output,
                "--width", "4", "--speed", "2", "--fps", "14"]));
            var bytes = await File.ReadAllBytesAsync(output);
            using (var frames = new MagickImageCollection(bytes))
            {
                Assert.Equal(2, frames.Count);
                Assert.Equal(11u, frames.Sum(frame => frame.AnimationDelay));
                Assert.Equal(3u, frames[0].AnimationIterations);
            }
            Assert.Equal(1, await CliApplication.RunAsync(["convert-gif", source, "--output", output, "--width", "4"]));
            Assert.Equal(bytes, await File.ReadAllBytesAsync(output));
            Assert.Equal(0, await CliApplication.RunAsync(["convert-gif", source, "--output", png, "--width", "4", "--frame", "2"]));
            using var frame = new MagickImage(png);
            Assert.Equal(MagickFormat.Png, frame.Format);
            Assert.Equal(48u, frame.Width);
            File.Delete(png);
            Assert.Equal(1, await CliApplication.RunAsync(["convert-gif", source, "--output", png, "--fps", "51"]));
            Assert.False(File.Exists(png));
        }
        finally
        {
            foreach (var file in directory.EnumerateFiles()) file.Delete();
            directory.Delete();
        }
    }
}

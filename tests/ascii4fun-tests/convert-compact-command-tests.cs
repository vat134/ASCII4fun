using System.Text;
using Ascii4Fun.Cli;
using Ascii4Fun.Compact;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Tests;

public sealed class ConvertCompactCommandTests
{
    [Fact]
    public async Task TxtIsExactDestinationPayloadAndPngMatchesPackage()
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-mini-");
        try
        {
            var input = Path.Combine(directory.FullName, "source.png");
            var text = Path.Combine(directory.FullName, "art.txt");
            var png = Path.Combine(directory.FullName, "art.png");
            var source = ColorAndPngTests.CreateColorImage();
            await File.WriteAllBytesAsync(input, source);
            var result = await new CompactArtConverter().ConvertAsync(new MemoryStream(source), new CompactArtOptions { Columns = 16, Destination = "twitch" });
            Assert.Equal(0, await CliApplication.RunAsync(["convert-compact", input, "--width", "16", "--destination", "twitch", "--output", text]));
            Assert.Equal(Encoding.UTF8.GetBytes(result.Payload.Text), await File.ReadAllBytesAsync(text));
            Assert.Equal(0, await CliApplication.RunAsync(["convert-compact", input, "--width", "16", "--destination", "twitch", "--format", "png", "--output", png]));
            Assert.Equal(await PngExporter.ExportAsync(result.Canvas), await File.ReadAllBytesAsync(png));
        }
        finally { directory.Delete(recursive: true); }
    }
}

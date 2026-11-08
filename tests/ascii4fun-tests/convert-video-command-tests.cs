using Ascii4Fun.Cli;
using Ascii4Fun.TestMedia;
using Ascii4Fun.Videos;

namespace Ascii4Fun.Tests;

public sealed class ConvertVideoCommandTests
{
    [Fact]
    public async Task CliExportsRetimedMp4WithSoundAndRefusesOverwrite()
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-video-cli-").FullName;
        try
        {
            var input = Path.Combine(directory, "source.mp4");
            var output = Path.Combine(directory, "ascii.mp4");
            await File.WriteAllBytesAsync(input, VideoFixture.Bytes());
            string[] args = ["convert-video", input, "--output", output, "--width", "8", "--speed", "2", "--fps", "5"];
            Assert.Equal(0, await CliApplication.RunAsync(args));
            var expected = await File.ReadAllBytesAsync(output);
            await using var clip = await VideoClip.OpenAsync(new MemoryStream(expected));
            Assert.True(clip.Metadata.HasAudio);
            Assert.Equal(1000, clip.Metadata.DurationMs);
            Assert.Equal(5, clip.Metadata.FramesPerSecond);
            Assert.Equal(1, await CliApplication.RunAsync(args));
            Assert.Equal(expected, await File.ReadAllBytesAsync(output));
        }
        finally { Directory.Delete(directory, recursive: true); }
    }
}

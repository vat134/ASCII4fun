using Ascii4Fun.Images;
using Ascii4Fun.TestMedia;
using Ascii4Fun.Videos;

namespace Ascii4Fun.Tests;

public sealed class VideoClipTests
{
    [Theory]
    [InlineData("mp4", "video-sample")]
    [InlineData("mov", "video-sample")]
    [InlineData("webm", "video-sample")]
    [InlineData("mov", "video-hevc")]
    [InlineData("webm", "video-vp8")]
    public async Task SupportedContainersPrepareAndExportWithSound(string extension, string name)
    {
        await using var input = new MemoryStream(VideoFixture.Bytes(extension, name));
        await using var clip = await VideoClip.OpenAsync(input);
        Assert.True(clip.Metadata.HasAudio);
        Assert.InRange(clip.Metadata.DurationMs, 1990, 2020);
        var prepared = await clip.PrepareAsync();
        await using var normalized = await VideoClip.OpenAsync(new MemoryStream(prepared));
        Assert.True(normalized.Metadata.HasAudio);
        var bytes = await normalized.ExportAsync(new CharacterImageOptions { OutputWidthInCells = 8 }, new() { Speed = 2, FramesPerSecond = 5 });
        await using var output = await VideoClip.OpenAsync(new MemoryStream(bytes));
        Assert.True(output.Metadata.HasAudio);
        Assert.InRange(output.Metadata.DurationMs, 990, 1030);
        Assert.Equal(5, output.Metadata.FramesPerSecond);
    }

    [Fact]
    public async Task CancellationJoinsTheCodecAndAllowsRetry()
    {
        await using var clip = await VideoClip.OpenAsync(new MemoryStream(VideoFixture.Bytes()));
        using var cancellation = new CancellationTokenSource();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => clip.ExportAsync(
            new CharacterImageOptions { OutputWidthInCells = 8 }, progress: new CancelOnFrame(cancellation), cancellationToken: cancellation.Token));
        var bytes = await clip.ExportAsync(new CharacterImageOptions { OutputWidthInCells = 8 });
        Assert.NotEmpty(bytes);
    }

    [Fact]
    public async Task RejectsMalformedMediaAndMissingToolsClearly()
    {
        await Assert.ThrowsAsync<InvalidDataException>(() => VideoClip.OpenAsync(new MemoryStream("not video"u8.ToArray())));
        var error = await Assert.ThrowsAsync<InvalidDataException>(() => VideoClip.OpenAsync(
            new MemoryStream(VideoFixture.Bytes()), new VideoTools(FfprobePath: "missing-ascii4fun-ffprobe")));
        Assert.Contains("FFmpeg and ffprobe", error.Message, StringComparison.Ordinal);
    }

    private sealed class CancelOnFrame(CancellationTokenSource cancellation) : IProgress<int>
    {
        public void Report(int value) => cancellation.Cancel();
    }

    [Fact]
    public async Task ArbitrarySlowSpeedKeepsTheFinalAudioEventAligned()
    {
        await using var clip = await VideoClip.OpenAsync(new MemoryStream(VideoFixture.Bytes(name: "video-audio-pulses")));
        var bytes = await clip.ExportAsync(new CharacterImageOptions { OutputWidthInCells = 8 }, new() { Speed = 0.3 });
        await using var decoder = new FfmpegProcess("ffmpeg", ["-v", "error", "-i", "pipe:0", "-ss", "6.1", "-t", "0.3", "-map", "0:a:0", "-f", "s16le", "-ac", "1", "-ar", "8000", "pipe:1"], default);
        using var audio = new MemoryStream();
        var reading = decoder.Output.CopyToAsync(audio);
        await decoder.Input.WriteAsync(bytes);
        await decoder.Input.DisposeAsync();
        await reading;
        await decoder.CompleteAsync(default);
        var samples = audio.ToArray();
        Assert.True(samples.Length >= 4000);
        var energy = Enumerable.Range(0, samples.Length / 2).Average(index => Math.Pow(BitConverter.ToInt16(samples, index * 2) / 32768d, 2));
        Assert.True(Math.Sqrt(energy) > 0.1, "The final source audio event must remain audible at its retimed position.");
    }

    [Theory]
    [InlineData("video-rotated", 90, 160)]
    [InlineData("video-anamorphic", 180, 90)]
    public async Task PreparationAndNativeExportNormalizeOrientationAndSampleAspect(string name, int width, int height)
    {
        await using var clip = await VideoClip.OpenAsync(new MemoryStream(VideoFixture.Bytes(name: name)));
        Assert.Equal(width, clip.Metadata.WidthInPixels);
        Assert.Equal(height, clip.Metadata.HeightInPixels);
        var bytes = await clip.PrepareAsync();
        await using var prepared = await VideoClip.OpenAsync(new MemoryStream(bytes));
        Assert.Equal(width, prepared.Metadata.WidthInPixels);
        Assert.Equal(height, prepared.Metadata.HeightInPixels);
        var output = await clip.ExportAsync(new CharacterImageOptions { OutputWidthInCells = 8 });
        await using var exported = await VideoClip.OpenAsync(new MemoryStream(output));
        Assert.Equal(96, exported.Metadata.WidthInPixels);
        Assert.Equal(name == "video-rotated" ? 168 : 48, exported.Metadata.HeightInPixels);
    }

    [Fact]
    public async Task AcceptsExactlyOneMinuteWithoutAudioAndRejectsLongerClips()
    {
        await using var clip = await VideoClip.OpenAsync(new MemoryStream(VideoFixture.Bytes(name: "video-60-seconds")));
        Assert.Equal(60000, clip.Metadata.DurationMs);
        Assert.False(clip.Metadata.HasAudio);
        var preparedBytes = await clip.PrepareAsync();
        await using var prepared = await VideoClip.OpenAsync(new MemoryStream(preparedBytes));
        Assert.Equal(60000, prepared.Metadata.DurationMs);
        var exportedBytes = await prepared.ExportAsync(new CharacterImageOptions { OutputWidthInCells = 8 });
        await using var exported = await VideoClip.OpenAsync(new MemoryStream(exportedBytes));
        Assert.False(exported.Metadata.HasAudio);
        Assert.Equal(60000, exported.Metadata.DurationMs);
        var error = await Assert.ThrowsAsync<InvalidDataException>(() => VideoClip.OpenAsync(
            new MemoryStream(VideoFixture.Bytes(name: "video-61-seconds"))));
        Assert.Contains("60 seconds", error.Message, StringComparison.Ordinal);
    }
}

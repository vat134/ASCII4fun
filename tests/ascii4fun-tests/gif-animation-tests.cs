using Ascii4Fun.Animations;
using Ascii4Fun.Images;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class GifAnimationTests
{
    [Fact]
    public async Task PartialFramesKeepGeometryTimingAndPreviousDisposal()
    {
        using var input = CreateFixture();
        using var animation = await GifAnimation.OpenAsync(input);
        Assert.Equal([30, 70, 110], animation.FrameDurationsMs);
        Assert.Equal(3, animation.Iterations);
        var options = new CharacterImageOptions { OutputWidthInCells = 4, SourceColors = true };
        var first = animation.ConvertFrame(0, options);
        var last = animation.ConvertFrame(2, options);
        Assert.Equal(4, last.WidthInCells);
        Assert.Equal(2, last.HeightInCells);
        Assert.Equal(first.Cells[0], last.Cells[0]);
        var bytes = await animation.ExportAsync(options);
        using var exported = new MagickImageCollection(bytes);
        Assert.Equal(3, exported.Count);
        Assert.Equal([3u, 7u, 11u], exported.Select(frame => frame.AnimationDelay));
        Assert.Equal(3u, exported[0].AnimationIterations);
        Assert.All(exported, frame => Assert.Equal(48u, frame.Width));
    }

    [Fact]
    public async Task CancellationAndMalformedInputFail()
    {
        using var cancelled = CreateFixture();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => GifAnimation.OpenAsync(cancelled, new CancellationToken(true)));
        using var invalid = new MemoryStream("GIF89a"u8.ToArray());
        await Assert.ThrowsAsync<InvalidDataException>(() => GifAnimation.OpenAsync(invalid));
    }

    [Fact]
    public async Task CoalescedSourceSurvivesCollectionAndHonorsExportCancellation()
    {
        using var input = CreateFixture();
        using var cancellation = new CancellationTokenSource();
        using var animation = await GifAnimation.OpenAsync(input, cancellation.Token);
        GC.Collect();
        GC.WaitForPendingFinalizers();
        Assert.NotEmpty(animation.ConvertFrame(2, cancellationToken: cancellation.Token).Text);
        var progress = new CancelAfterFirstFrame(cancellation);
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => animation.ExportAsync(
            new CharacterImageOptions { OutputWidthInCells = 4 }, progress: progress, cancellationToken: cancellation.Token));
    }

    [Fact]
    public async Task RejectsExcessiveFramesAndLogicalCanvasBeforeCoalescing()
    {
        using var frames = new MagickImageCollection();
        for (var index = 0; index < 301; index++) frames.Add(new MagickImage(MagickColors.Red, 1, 1));
        using var excessive = new MemoryStream(frames.ToByteArray(MagickFormat.Gif));
        await Assert.ThrowsAsync<InvalidDataException>(() => GifAnimation.OpenAsync(excessive));
        using var input = CreateFixture();
        var bytes = input.ToArray();
        bytes[6] = 255; bytes[7] = 127; // 32,767-pixel logical width.
        using var oversized = new MemoryStream(bytes);
        await Assert.ThrowsAsync<InvalidDataException>(() => GifAnimation.OpenAsync(oversized));
        bytes[6] = 2; bytes[7] = 0; // The first 4-pixel frame extends outside this logical canvas.
        using var outsideCanvas = new MemoryStream(bytes);
        await Assert.ThrowsAsync<InvalidDataException>(() => GifAnimation.OpenAsync(outsideCanvas));
    }

    [Fact]
    public async Task ExportUsesSelectedFpsAndSpeedAndRejectsExcessiveRasterWork()
    {
        using var input = CreateFixture();
        using var animation = await GifAnimation.OpenAsync(input);
        var options = new CharacterImageOptions { OutputWidthInCells = 4 };
        var bytes = await animation.ExportAsync(options, new AnimationPlaybackOptions { Speed = 2, FramesPerSecond = 10 });
        using var frames = new MagickImageCollection(bytes);
        Assert.Single(frames);
        Assert.Equal(11u, frames.Sum(frame => frame.AnimationDelay));
        await Assert.ThrowsAsync<InvalidDataException>(() => animation.ExportAsync(
            new CharacterImageOptions { OutputWidthInCells = 500 }, new AnimationPlaybackOptions { Speed = 0.25, FramesPerSecond = 10 }));
    }

    private sealed class CancelAfterFirstFrame(CancellationTokenSource cancellation) : IProgress<int>
    {
        public void Report(int value) => cancellation.Cancel();
    }

    private static MemoryStream CreateFixture()
    {
        using var frames = new MagickImageCollection();
        frames.Add(new MagickImage(MagickColors.Red, 4, 4) { AnimationDelay = 3, AnimationIterations = 3, GifDisposeMethod = GifDisposeMethod.None });
        frames.Add(new MagickImage(MagickColors.Lime, 2, 2) { AnimationDelay = 7, Page = new MagickGeometry(1, 1, 4, 4), GifDisposeMethod = GifDisposeMethod.Previous });
        frames.Add(new MagickImage(MagickColors.Blue, 1, 1) { AnimationDelay = 11, Page = new MagickGeometry(3, 3, 4, 4), GifDisposeMethod = GifDisposeMethod.Background });
        return new MemoryStream(frames.ToByteArray(MagickFormat.Gif));
    }
}

using Ascii4Fun.Animations;
using Ascii4Fun.Videos;

namespace Ascii4Fun.Tests;

public sealed class VideoTimelineTests
{
    [Fact]
    public void OriginalSixtyFpsPreservesEveryFrameWithoutGifDelayRounding()
    {
        var frames = VideoTimeline.Create(3600, 60000, new());
        Assert.Equal(3600, frames.Count);
        Assert.Equal(60000, frames.Sum(frame => frame.FrameDurationMs));
        Assert.Equal(Enumerable.Range(0, 3600), frames.Select(frame => frame.SourceFrameIndex));
    }

    [Fact]
    public void SpeedAndCadenceSampleSourceTimeIndependently()
    {
        var frames = VideoTimeline.Create(30, 3000, new() { Speed = 2, FramesPerSecond = 5 });
        Assert.Equal(8, frames.Count);
        Assert.Equal(1500, frames.Sum(frame => frame.FrameDurationMs));
        Assert.Equal([0, 4, 8, 12, 16, 20, 24, 28], frames.Select(frame => frame.SourceFrameIndex));
    }

    [Theory]
    [InlineData(0, 1000)]
    [InlineData(3601, 60000)]
    [InlineData(30, 60001)]
    [InlineData(30, 0)]
    [InlineData(61, 1000)]
    public void RejectsExcessiveOrInvalidSources(int count, double durationMs) =>
        Assert.Throws<InvalidDataException>(() => VideoTimeline.Create(count, durationMs, new()));

    [Fact]
    public void RejectsUpsamplingEvenAtHigherSpeed() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => VideoTimeline.Create(30, 3000, new() { Speed = 4, FramesPerSecond = 11 }));
}

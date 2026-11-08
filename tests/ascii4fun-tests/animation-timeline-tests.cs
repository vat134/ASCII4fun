using Ascii4Fun.Animations;

namespace Ascii4Fun.Tests;

public sealed class AnimationTimelineTests
{
    [Fact]
    public void SourceCadenceUsesTheWholeSequenceRatherThanItsShortestFrame()
    {
        Assert.Equal(10, AnimationTimeline.GetSourceFramesPerSecond([100, 100, 100]));
        Assert.Equal(1000d / 70, AnimationTimeline.GetSourceFramesPerSecond([30, 70, 110]), precision: 10);
        Assert.Equal(0.5, AnimationTimeline.GetSourceFramesPerSecond([2000]));
    }
    [Fact]
    public void ExplicitFpsCannotExceedTheSourceAverageEvenWhenSpeedChanges()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => AnimationTimeline.Create(
            [100, 100, 100], new AnimationPlaybackOptions { FramesPerSecond = 11 }));
        Assert.Throws<ArgumentOutOfRangeException>(() => AnimationTimeline.Create(
            [30, 70, 110], new AnimationPlaybackOptions { Speed = 2, FramesPerSecond = 15 }));
        var original = AnimationTimeline.Create([30, 70, 110], new AnimationPlaybackOptions());
        Assert.Equal([30, 70, 110], original.Select(frame => frame.FrameDurationMs));
    }
    [Fact]
    public void OriginalTimingPreservesIrregularDelays()
    {
        var frames = AnimationTimeline.Create([30, 70, 110], new AnimationPlaybackOptions());
        Assert.Equal([30, 70, 110], frames.Select(frame => frame.FrameDurationMs));
        Assert.Equal([0, 1, 2], frames.Select(frame => frame.SourceFrameIndex));
    }

    [Fact]
    public void FpsResamplesWithoutChangingDuration()
    {
        var frames = AnimationTimeline.Create([100, 100, 100], new AnimationPlaybackOptions { FramesPerSecond = 5 });
        Assert.Equal(2, frames.Count);
        Assert.Equal(300, frames.Sum(frame => frame.FrameDurationMs));
        Assert.Equal([0, 2], frames.Select(frame => frame.SourceFrameIndex));
    }

    [Fact]
    public void SpeedChangesExportDuration()
    {
        var frames = AnimationTimeline.Create([100, 100], new AnimationPlaybackOptions { Speed = 2 });
        Assert.Equal([50, 50], frames.Select(frame => frame.FrameDurationMs));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(10)]
    public void BrowserShortDelayPolicyIsExplicit(int delay)
    {
        Assert.Equal(100, AnimationTimeline.NormalizeSourceDelay(delay));
    }

    [Fact]
    public void InvalidPlaybackSettingsFailBeforeWork()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => AnimationTimeline.Create([100], new AnimationPlaybackOptions { Speed = 0 }));
        Assert.Throws<ArgumentOutOfRangeException>(() => AnimationTimeline.Create([100], new AnimationPlaybackOptions { FramesPerSecond = 51 }));
        Assert.Throws<ArgumentException>(() => AnimationTimeline.Create([], new AnimationPlaybackOptions()));
        Assert.Throws<InvalidDataException>(() => AnimationTimeline.Create(
            Enumerable.Repeat(20, 3001).ToArray(), new AnimationPlaybackOptions()));
    }

    [Fact]
    public void FastPlaybackDropsUnrepresentableFramesInsteadOfStretchingDuration()
    {
        var frames = AnimationTimeline.Create(Enumerable.Repeat(20, 20).ToArray(), new AnimationPlaybackOptions { Speed = 4 });
        Assert.Equal(100, frames.Sum(frame => frame.FrameDurationMs));
        Assert.All(frames, frame => Assert.True(frame.FrameDurationMs >= 20));
        var fractional = AnimationTimeline.Create([110], new AnimationPlaybackOptions { FramesPerSecond = 5 });
        Assert.Equal(110, fractional.Sum(frame => frame.FrameDurationMs));
    }
}

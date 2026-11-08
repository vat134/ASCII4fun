using Ascii4Fun.Animations;

namespace Ascii4Fun.Videos;

/// <summary>Source-time sampling for normalized constant-cadence video, without GIF delay rounding.</summary>
public static class VideoTimeline
{
    /// <summary>Creates the shared preview/export timeline. Speed changes duration; explicit FPS changes cadence.</summary>
    public static IReadOnlyList<AnimationFrameTiming> Create(int frameCount, double durationMs, AnimationPlaybackOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.Validate(60);
        if (frameCount is < 1 or > 3600 || !double.IsFinite(durationMs) || durationMs is <= 0 or > 60000)
            throw new InvalidDataException("Choose a video up to 60 seconds and 3,600 source frames.");
        var sourceFps = frameCount * 1000d / durationMs;
        if (sourceFps > 60 + 0.000001) throw new InvalidDataException("Video supports up to 60 source FPS.");
        if (options.FramesPerSecond > sourceFps + 0.000001)
            throw new ArgumentOutOfRangeException(nameof(options), "FPS cannot exceed the source average frame rate.");
        var outputDurationMs = durationMs / options.Speed;
        var fps = options.FramesPerSecond ?? sourceFps * options.Speed;
        var count = checked((int)Math.Ceiling(outputDurationMs * fps / 1000 - 0.000001));
        var frames = new AnimationFrameTiming[count];
        var previousEndMs = 0;
        for (var index = 0; index < count; index++)
        {
            var sourceIndex = Math.Min(frameCount - 1, (int)Math.Floor(index / fps * options.Speed * sourceFps + 0.000001));
            var endMs = (int)Math.Round(Math.Min((index + 1) * 1000 / fps, outputDurationMs));
            frames[index] = new AnimationFrameTiming(sourceIndex, endMs - previousEndMs);
            previousEndMs = endMs;
        }
        return Array.AsReadOnly(frames);
    }
}

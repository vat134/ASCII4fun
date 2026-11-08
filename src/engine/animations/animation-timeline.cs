namespace Ascii4Fun.Animations;

/// <summary>A source-frame reference and its GIF-representable display duration.</summary>
/// <param name="SourceFrameIndex">Zero-based source frame.</param>
/// <param name="FrameDurationMs">Duration in milliseconds, in multiples of 10.</param>
public sealed record AnimationFrameTiming(int SourceFrameIndex, int FrameDurationMs);

/// <summary>Deterministic source-time sampling shared by playback and GIF export.</summary>
public static class AnimationTimeline
{
    private const int MaxOutputFrames = 3_000;
    private const int MaxDurationMs = 300_000;

    /// <summary>Matches common browser GIF playback for absent or 0/10 ms delays.</summary>
    internal static int NormalizeSourceDelay(int frameDurationMs) => frameDurationMs <= 10 ? 100 : frameDurationMs;

    /// <summary>Average source cadence from positive, normalized frame durations, before playback speed.</summary>
    public static double GetSourceFramesPerSecond(IReadOnlyList<int> sourceDurationsMs)
    {
        ArgumentNullException.ThrowIfNull(sourceDurationsMs);
        if (sourceDurationsMs.Count == 0 || sourceDurationsMs.Any(duration => duration <= 0))
            throw new ArgumentException("Animation requires positive frame durations.", nameof(sourceDurationsMs));
        return sourceDurationsMs.Count * 1000d / sourceDurationsMs.Sum(duration => (long)duration);
    }

    /// <summary>Maps source durations to output frames. FPS resamples motion; speed changes duration.</summary>
    /// <param name="sourceDurationsMs">Positive source durations after short-delay normalization.</param>
    /// <param name="options">Requested playback and export cadence.</param>
    /// <returns>Ordered frame references with centisecond timing and cumulative rounding.</returns>
    public static IReadOnlyList<AnimationFrameTiming> Create(IReadOnlyList<int> sourceDurationsMs, AnimationPlaybackOptions options)
    {
        ArgumentNullException.ThrowIfNull(sourceDurationsMs);
        ArgumentNullException.ThrowIfNull(options);
        options.Validate();
        var sourceFramesPerSecond = GetSourceFramesPerSecond(sourceDurationsMs);
        if (options.FramesPerSecond > sourceFramesPerSecond)
            throw new ArgumentOutOfRangeException(nameof(options), "FPS cannot exceed the source GIF's average frame rate.");
        var totalSourceMs = sourceDurationsMs.Sum(duration => (long)duration);
        var durationMs = totalSourceMs / options.Speed;
        if (durationMs > MaxDurationMs) throw new InvalidDataException("Animation exceeds the five-minute output limit.");
        var frames = new List<AnimationFrameTiming>();
        var sourceIndex = 0;
        double sourceEndMs = sourceDurationsMs[0];
        var previousEndMs = 0;
        var effectiveFps = options.FramesPerSecond ?? (sourceDurationsMs.Any(delay => delay / options.Speed < 20) ? 50 : (int?)null);
        if (effectiveFps is { } fps)
        {
            var count = checked((int)Math.Ceiling(durationMs * fps / 1000));
            for (var index = 0; index < count; index++)
            {
                var sourceTimeMs = index * 1000d / fps * options.Speed;
                while (sourceIndex < sourceDurationsMs.Count - 1 && sourceTimeMs >= sourceEndMs)
                    sourceEndMs += sourceDurationsMs[++sourceIndex];
                AddFrame(sourceIndex, Math.Min((index + 1) * 1000d / fps, durationMs));
            }
        }
        else
        {
            long elapsedMs = 0;
            for (var index = 0; index < sourceDurationsMs.Count; index++)
            {
                elapsedMs += sourceDurationsMs[index];
                AddFrame(index, elapsedMs / options.Speed);
            }
        }
        var roundedDurationMs = Math.Max(20, (int)Math.Round(durationMs / 10, MidpointRounding.AwayFromZero) * 10);
        if (frames.Count == 0) frames.Add(new AnimationFrameTiming(0, roundedDurationMs));
        else if (roundedDurationMs > previousEndMs)
            frames[^1] = frames[^1] with { FrameDurationMs = frames[^1].FrameDurationMs + roundedDurationMs - previousEndMs };
        return frames.AsReadOnly();

        void AddFrame(int index, double endMs)
        {
            var roundedEndMs = (int)Math.Round(endMs / 10, MidpointRounding.AwayFromZero) * 10;
            if (roundedEndMs - previousEndMs < 20) return;
            if (frames.Count == MaxOutputFrames) throw new InvalidDataException("Animation exceeds the 3,000 output-frame limit.");
            frames.Add(new AnimationFrameTiming(index, roundedEndMs - previousEndMs));
            previousEndMs = roundedEndMs;
        }
    }
}

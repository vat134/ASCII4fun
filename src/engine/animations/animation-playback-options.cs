namespace Ascii4Fun.Animations;

/// <summary>Shared preview/export timing. Omitted FPS preserves the source frame sequence.</summary>
public sealed record AnimationPlaybackOptions
{
    /// <summary>Playback rate from 0.25 to 4; 2 plays twice as fast.</summary>
    public double Speed { get; init; } = 1;

    /// <summary>Optional uniform cadence: 1..50 FPS for GIF, 1..60 for video; capped by the source average before speed.</summary>
    public int? FramesPerSecond { get; init; }

    internal void Validate(int maxFramesPerSecond = 50)
    {
        if (!double.IsFinite(Speed) || Speed is < 0.25 or > 4)
            throw new ArgumentOutOfRangeException(paramName: null, "Speed must be between 0.25 and 4.");
        if (FramesPerSecond is < 1 || FramesPerSecond > maxFramesPerSecond)
            throw new ArgumentOutOfRangeException(paramName: null, $"FPS must be between 1 and {maxFramesPerSecond}.");
    }
}

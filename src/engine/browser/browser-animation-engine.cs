using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using System.Text.Json.Serialization;
using Ascii4Fun.Animations;
using Ascii4Fun.Images;
using Ascii4Fun.Media;

namespace Ascii4Fun.Browser;

[SupportedOSPlatform("browser")]
internal static partial class BrowserConversionEngine
{
    private static LuminanceRange? animationRange;

    [JSExport]
    public static bool IsGif(byte[] bytes) => bytes.Length >= 6 &&
        (bytes.AsSpan(0, 6).SequenceEqual("GIF89a"u8) || bytes.AsSpan(0, 6).SequenceEqual("GIF87a"u8));

    [JSExport]
    public static void ValidateAnimationSource(int width, int height, int frameCount) =>
        AnimationLimits.ValidateSource(width, height, frameCount);

    [JSExport]
    public static double[] AnalyzeAnimationFrame(byte[] rgba, int width, int height)
    {
        if (width < 1 || height < 1 || (long)width * height > ConversionLimits.Default.MaxGridCells * 8L
            || rgba.LongLength != (long)width * height * 4)
            throw new InvalidDataException("Invalid animation sample grid.");
        var range = LuminanceRange.Analyze(new RgbaGrid(width, height, rgba));
        return [range.Minimum, range.Maximum];
    }

    [JSExport]
    public static void SetAnimationRange(double minimum, double maximum)
    {
        if (!double.IsFinite(minimum) || !double.IsFinite(maximum) || minimum < 0 || maximum > 1 || minimum > maximum)
            throw new ArgumentOutOfRangeException(nameof(minimum));
        animationRange = new LuminanceRange(minimum, maximum);
    }

    [JSExport]
    public static double SourceFramesPerSecond(string durationsJson) =>
        AnimationTimeline.GetSourceFramesPerSecond(ReadAnimationDurations(durationsJson));

    [JSExport]
    public static string AnimationTiming(string durationsJson, double speed, int fps)
    {
        var timings = AnimationTimeline.Create(ReadAnimationDurations(durationsJson),
            new AnimationPlaybackOptions { Speed = speed, FramesPerSecond = fps == 0 ? null : fps });
        return JsonSerializer.Serialize(timings.ToArray(), AnimationJson.Default.AnimationFrameTimingArray);
    }

    private static int[] ReadAnimationDurations(string durationsJson) =>
        (JsonSerializer.Deserialize(durationsJson, AnimationJson.Default.Int32Array)
            ?? throw new ArgumentException("Frame durations are required.", nameof(durationsJson)))
        .Select(AnimationTimeline.NormalizeSourceDelay).ToArray();
}

[System.Text.Json.Serialization.JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[System.Text.Json.Serialization.JsonSerializable(typeof(int[]))]
[System.Text.Json.Serialization.JsonSerializable(typeof(AnimationFrameTiming[]))]
internal sealed partial class AnimationJson : System.Text.Json.Serialization.JsonSerializerContext;

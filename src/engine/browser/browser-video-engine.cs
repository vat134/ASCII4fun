using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using Ascii4Fun.Animations;
using Ascii4Fun.Videos;

namespace Ascii4Fun.Browser;

[SupportedOSPlatform("browser")]
internal static partial class BrowserConversionEngine
{
    [JSExport]
    public static string VideoTiming(int frameCount, double durationMs, double speed, int fps) =>
        JsonSerializer.Serialize(VideoTimeline.Create(frameCount, durationMs,
            new AnimationPlaybackOptions { Speed = speed, FramesPerSecond = fps == 0 ? null : fps }).ToArray(),
            AnimationJson.Default.AnimationFrameTimingArray);
}

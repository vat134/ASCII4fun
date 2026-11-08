namespace Ascii4Fun.Videos;

/// <summary>External video tools. Executables are not bundled with the engine.</summary>
/// <param name="FfmpegPath">FFmpeg executable path or PATH command.</param>
/// <param name="FfprobePath">ffprobe executable path or PATH command.</param>
public sealed record VideoTools(string FfmpegPath = "ffmpeg", string FfprobePath = "ffprobe");

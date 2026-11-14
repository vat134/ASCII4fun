using System.Globalization;
using System.Text.Json;

namespace Ascii4Fun.Videos;

/// <summary>Validated source video information, before playback retiming.</summary>
/// <param name="WidthInPixels">Frame width after orientation and sample-aspect normalization.</param>
/// <param name="HeightInPixels">Frame height after orientation and sample-aspect normalization.</param>
/// <param name="DurationMs">Source duration in milliseconds.</param>
/// <param name="FramesPerSecond">Average source frame rate.</param>
/// <param name="HasAudio">Whether a source audio track exists.</param>
/// <param name="FrameCount">Decoded source frame count.</param>
public sealed record VideoMetadata(int WidthInPixels, int HeightInPixels, double DurationMs, double FramesPerSecond, bool HasAudio, int FrameCount)
{
    internal double StartTimeSeconds { get; init; }

    internal static async Task<VideoMetadata> ReadAsync(string path, VideoTools tools, CancellationToken token)
    {
        await using var probe = new FfmpegProcess(tools.FfprobePath,
            ["-v", "error", "-protocol_whitelist", "file,pipe", "-format_whitelist", "mov,matroska,webm", "-max_pixels", VideoClip.MaxSourcePixels.ToString(CultureInfo.InvariantCulture), "-show_streams", "-show_format", "-of", "json", path], token);
        using var reader = new StreamReader(probe.Output);
        var json = await FfmpegProcess.ReadBoundedAsync(reader, 131072);
        await probe.CompleteAsync(token);
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            var format = root.GetProperty("format");
            var name = format.GetProperty("format_name").GetString();
            if (name is not ("mov,mp4,m4a,3gp,3g2,mj2" or "matroska,webm"))
                throw new InvalidDataException("Choose MP4, WebM or MOV video.");
            var streams = root.GetProperty("streams").EnumerateArray().ToArray();
            var videos = streams.Where(stream => stream.GetProperty("codec_type").GetString() == "video").ToArray();
            if (videos.Length != 1) throw new InvalidDataException("Choose a clip with exactly one video stream.");
            var video = videos[0];
            if (video.GetProperty("codec_name").GetString() is not ("h264" or "hevc" or "vp8" or "vp9"))
                throw new InvalidDataException("Video supports H.264, HEVC, VP8 and VP9 codecs.");
            var width = video.GetProperty("width").GetInt32();
            var height = video.GetProperty("height").GetInt32();
            if (video.TryGetProperty("sample_aspect_ratio", out var sampleAspect) && sampleAspect.GetString() is { } aspect && aspect != "N/A")
            {
                var aspectParts = aspect.Split(':');
                var numerator = double.Parse(aspectParts[0], CultureInfo.InvariantCulture);
                var denominator = double.Parse(aspectParts[1], CultureInfo.InvariantCulture);
                if (numerator <= 0 || denominator <= 0) throw new InvalidDataException("Invalid video sample aspect ratio.");
                width = checked((int)Math.Round(width * numerator / denominator));
            }
            if (video.TryGetProperty("side_data_list", out var sideData))
            {
                foreach (var item in sideData.EnumerateArray())
                {
                    if (!item.TryGetProperty("rotation", out var rotation)) continue;
                    var degrees = rotation.GetDouble();
                    if (degrees % 90 != 0) throw new InvalidDataException("Video supports rotation in 90-degree steps.");
                    if (Math.Abs(degrees % 180) == 90) (width, height) = (height, width);
                }
            }
            if (width < 1 || height < 1 || width > 1920 || height > 1920 || (long)width * height > VideoClip.MaxSourcePixels)
                throw new InvalidDataException("Video supports up to 1920 × 1080 pixels, including portrait orientation.");
            var timing = await VideoFrameProbe.ReadAsync(path, video.GetProperty("time_base").GetString()!, tools, token);
            return new(width, height, timing.DurationSeconds * 1000, timing.FramesPerSecond,
                streams.Any(stream => stream.GetProperty("codec_type").GetString() == "audio"), timing.FrameCount)
            {
                StartTimeSeconds = timing.StartTimeSeconds
            };
        }
        catch (Exception exception) when (exception is JsonException or KeyNotFoundException or FormatException or InvalidOperationException or IndexOutOfRangeException or OverflowException)
        {
            throw new InvalidDataException("The video metadata is incomplete or invalid.", exception);
        }
    }
}

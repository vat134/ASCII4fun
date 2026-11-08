using Ascii4Fun.Animations;
using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Videos;

internal static class VideoExporter
{
    public static async Task<byte[]> ExportAsync(string sourcePath, string outputPath, VideoTools tools, VideoMetadata metadata,
        CharacterImageOptions options, AnimationPlaybackOptions playback, IProgress<int>? progress, CancellationToken token)
    {
        options.ValidateAndGetRamp();
        var timeline = VideoTimeline.Create(metadata.FrameCount, metadata.DurationMs, playback);
        var height = ImageGridGeometry.CalculateOutputHeight((uint)metadata.WidthInPixels, (uint)metadata.HeightInPixels, options.OutputWidthInCells,
            CharacterCellGeometry.AspectRatio, ConversionLimits.Default.MaxGridCells);
        var widthInPixels = options.OutputWidthInCells * CharacterCellGeometry.WidthInPixels;
        var heightInPixels = height * CharacterCellGeometry.HeightInPixels;
        SourcePhotoGeometry.ByteLength(options.OutputWidthInCells, height);
        var outputFps = playback.FramesPerSecond ?? metadata.FramesPerSecond * playback.Speed;
        var outputDurationSeconds = metadata.DurationMs / 1000 / playback.Speed;
        await using var decoder = new FfmpegProcess(tools.FfmpegPath,
            ["-v", "error", "-nostdin", "-protocol_whitelist", "file,pipe", "-format_whitelist", "mov,matroska,webm", "-max_pixels", VideoClip.MaxSourcePixels.ToString(System.Globalization.CultureInfo.InvariantCulture), "-i", sourcePath,
                "-map", "0:v:0", "-an", "-vf", $"scale={metadata.WidthInPixels}:{metadata.HeightInPixels},setsar=1,fps={VideoClip.Number(metadata.FramesPerSecond)}",
                "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"], token);
        var tempo = playback.Speed < 0.5 ? $"atempo=0.5,atempo={VideoClip.Number(playback.Speed / 0.5)}" : playback.Speed > 2
            ? $"atempo=2,atempo={VideoClip.Number(playback.Speed / 2)}" : $"atempo={VideoClip.Number(playback.Speed)}";
        await using var encoder = new FfmpegProcess(tools.FfmpegPath,
            ["-v", "error", "-nostdin", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", $"{widthInPixels}x{heightInPixels}",
                "-r", VideoClip.Number(outputFps), "-i", "pipe:0", "-protocol_whitelist", "file,pipe", "-format_whitelist", "mov,matroska,webm", "-max_pixels", VideoClip.MaxSourcePixels.ToString(System.Globalization.CultureInfo.InvariantCulture), "-i", sourcePath,
                "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p",
                "-af", $"aresample=async=1:first_pts=0,{tempo},apad", "-c:a", "aac", "-b:a", "192k",
                "-t", VideoClip.Number(outputDurationSeconds), "-fs", VideoClip.MaxEncodedBytes.ToString(System.Globalization.CultureInfo.InvariantCulture),
                "-map_metadata", "-1", "-movflags", "+faststart", outputPath], token);
        var rgba = new byte[checked(metadata.WidthInPixels * metadata.HeightInPixels * 4)];
        var decodedIndex = -1;
        try
        {
            for (var index = 0; index < timeline.Count; index++)
            {
                while (decodedIndex < timeline[index].SourceFrameIndex)
                {
                    await decoder.Output.ReadExactlyAsync(rgba, token);
                    decodedIndex++;
                }
                var rgb = VideoFrameConverter.Render(rgba, metadata, options, token);
                await encoder.Input.WriteAsync(rgb, token);
                progress?.Report(index + 1);
            }
            await encoder.Input.DisposeAsync();
            // Drain any codec rounding tail before joining; source frames remain bounded by metadata.
            await decoder.Output.CopyToAsync(Stream.Null, token);
            await decoder.CompleteAsync(token);
            await encoder.CompleteAsync(token);
        }
        catch (IOException exception)
        {
            token.ThrowIfCancellationRequested();
            throw new InvalidDataException("Video frames could not be decoded or encoded.", exception);
        }
        return await VideoClip.ReadOutputAsync(outputPath, token);
    }
}

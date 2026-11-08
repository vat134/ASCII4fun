using System.Globalization;
using Ascii4Fun.Animations;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Videos;

/// <summary>A request-owned video source. Disposal removes all temporary media.</summary>
public sealed class VideoClip : IAsyncDisposable
{
    /// <summary>Maximum encoded source or prepared video size: 100 MiB.</summary>
    public const long MaxEncodedBytes = 100 * 1024 * 1024;
    internal const int MaxSourcePixels = 1920 * 1080;
    private readonly string directory;
    private readonly string sourcePath;
    private readonly VideoTools tools;
    private bool disposed;

    private VideoClip(string directory, VideoTools tools, VideoMetadata metadata)
    {
        this.directory = directory;
        sourcePath = Path.Combine(directory, "source");
        this.tools = tools;
        Metadata = metadata;
    }

    /// <summary>Validated source information.</summary>
    public VideoMetadata Metadata { get; }

    /// <summary>Copies and validates bounded transient media. No caller filename is used by the codec.</summary>
    public static async Task<VideoClip> OpenAsync(Stream input, VideoTools? tools = null, CancellationToken cancellationToken = default)
    {
        tools ??= new();
        var directory = Directory.CreateTempSubdirectory("ascii4fun-video-").FullName;
        try
        {
            var path = Path.Combine(directory, "source");
            await using (var output = File.Create(path))
            {
                var buffer = new byte[65536];
                long length = 0;
                int count;
                while ((count = await input.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    length += count;
                    if (length > MaxEncodedBytes) throw new InvalidDataException("Choose a video up to 100 MiB.");
                    await output.WriteAsync(buffer.AsMemory(0, count), cancellationToken);
                }
                if (length == 0) throw new InvalidDataException("Choose a non-empty video.");
            }
            return new(directory, tools, await VideoMetadata.ReadAsync(path, tools, cancellationToken));
        }
        catch
        {
            Directory.Delete(directory, recursive: true);
            throw;
        }
    }

    /// <summary>Normalizes supported input to a browser-readable H.264/AAC MP4 at the source average cadence.</summary>
    public async Task<byte[]> PrepareAsync(CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(disposed, this);
        var path = Path.Combine(directory, "prepared.mp4");
        await using var process = new FfmpegProcess(tools.FfmpegPath,
            ["-v", "error", "-nostdin", "-y", "-protocol_whitelist", "file,pipe", "-format_whitelist", "mov,matroska,webm", "-max_pixels", MaxSourcePixels.ToString(CultureInfo.InvariantCulture), "-i", sourcePath,
                "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-dn", "-vf", $"scale={Metadata.WidthInPixels}:{Metadata.HeightInPixels},fps={Number(Metadata.FramesPerSecond)},pad=ceil(iw/2)*2:ceil(ih/2)*2,setsar=1",
                "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p",
                "-af", "aresample=async=1:first_pts=0,apad", "-c:a", "aac", "-b:a", "192k",
                "-t", Number(Metadata.DurationMs / 1000), "-fs", MaxEncodedBytes.ToString(CultureInfo.InvariantCulture),
                "-map_metadata", "-1", "-movflags", "+faststart", path], cancellationToken);
        await process.CompleteAsync(cancellationToken);
        return await ReadOutputAsync(path, cancellationToken);
    }

    /// <summary>Streams converted frames into MP4, preserving and retiming the first audio track.</summary>
    public Task<byte[]> ExportAsync(CharacterImageOptions? options = null, AnimationPlaybackOptions? playback = null,
        IProgress<int>? progress = null, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(disposed, this);
        return VideoExporter.ExportAsync(sourcePath, Path.Combine(directory, "ascii.mp4"), tools, Metadata,
            options ?? new(), playback ?? new(), progress, cancellationToken);
    }

    internal static string Number(double value) => value.ToString("G17", CultureInfo.InvariantCulture);

    internal static async Task<byte[]> ReadOutputAsync(string path, CancellationToken token)
    {
        var length = new FileInfo(path).Length;
        if (length == 0 || length >= MaxEncodedBytes)
            throw new InvalidDataException("Video exceeds the 100 MiB output limit. Choose fewer columns or lower FPS.");
        return await File.ReadAllBytesAsync(path, token);
    }

    /// <summary>Deletes request-owned source and output files.</summary>
    public ValueTask DisposeAsync()
    {
        if (!disposed) { disposed = true; Directory.Delete(directory, recursive: true); }
        return ValueTask.CompletedTask;
    }
}

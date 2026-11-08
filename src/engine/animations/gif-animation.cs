using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Animations;

/// <summary>A transient, bounded native GIF source. Dispose to release decoded media.</summary>
/// <remarks>One caller at a time; frame conversion and export share the still-image mapping and rasterizer.</remarks>
public sealed class GifAnimation : IDisposable
{
    private readonly MagickImageCollection frames;
    private (int Width, LuminanceRange Range)? toneRange;
    private bool disposed;

    private GifAnimation(MagickImageCollection frames)
    {
        this.frames = frames;
        Iterations = checked((int)frames[0].AnimationIterations);
        FrameDurationsMs = Array.AsReadOnly(frames.Select(frame => AnimationTimeline.NormalizeSourceDelay(
            checked((int)Math.Round(frame.AnimationDelay * 1000d / Math.Max(1, frame.AnimationTicksPerSecond))))).ToArray());
    }

    /// <summary>Source delays in milliseconds, with explicit browser-compatible short-delay handling.</summary>
    public IReadOnlyList<int> FrameDurationsMs { get; }

    /// <summary>Total plays, or zero for indefinite repetition.</summary>
    public int Iterations { get; }

    /// <summary>Reads a bounded GIF stream and reconstructs partial frames through ImageMagick.</summary>
    public static async Task<GifAnimation> OpenAsync(Stream encodedGif, CancellationToken cancellationToken = default) =>
        new(await MagickGifReader.ReadAsync(encodedGif, cancellationToken));

    /// <summary>Converts one source frame using sequence-wide sampled luminance bounds.</summary>
    public AsciiCanvas ConvertFrame(int frameIndex, CharacterImageOptions? options = null, CancellationToken cancellationToken = default)
    {
        ObjectDisposedException.ThrowIf(disposed, this);
        ArgumentOutOfRangeException.ThrowIfNegative(frameIndex);
        ArgumentOutOfRangeException.ThrowIfGreaterThanOrEqual(frameIndex, frames.Count);
        options ??= new CharacterImageOptions();
        options.ValidateAndGetRamp();
        var height = ImageGridGeometry.CalculateOutputHeight(frames[0].Width, frames[0].Height, options.OutputWidthInCells,
            CharacterCellGeometry.AspectRatio, ConversionLimits.Default.MaxGridCells);
        if (toneRange is not { } cached || cached.Width != options.OutputWidthInCells)
        {
            var minimum = double.MaxValue;
            var maximum = double.MinValue;
            foreach (var frame in frames)
            {
                var range = LuminanceRange.Analyze(Sample(frame, options.OutputWidthInCells, height, cancellationToken), cancellationToken);
                minimum = Math.Min(minimum, range.Minimum);
                maximum = Math.Max(maximum, range.Maximum);
            }
            toneRange = (options.OutputWidthInCells, new LuminanceRange(minimum, maximum));
        }
        var grid = Sample(frames[frameIndex], options.OutputWidthInCells, height, cancellationToken);
        byte[]? photo = null;
        if (options.SourcePhotoOpacity > 0)
        {
            SourcePhotoGeometry.ByteLength(options.OutputWidthInCells, height);
            photo = SamplePixels(frames[frameIndex], options.OutputWidthInCells * CharacterCellGeometry.WidthInPixels, height * CharacterCellGeometry.HeightInPixels, cancellationToken);
        }
        return CharacterImagePipeline.Convert(grid, options, photo, toneRange.Value.Range, cancellationToken);
    }

    /// <summary>Exports the same canvases with shared playback timing; progress counts rendered output frames.</summary>
    public Task<byte[]> ExportAsync(CharacterImageOptions? options = null, AnimationPlaybackOptions? playback = null,
        IProgress<int>? progress = null, CancellationToken cancellationToken = default) =>
        GifExporter.ExportAsync(this, options ?? new CharacterImageOptions(), playback ?? new AnimationPlaybackOptions(), progress, cancellationToken);

    /// <summary>Releases all native source frames.</summary>
    public void Dispose()
    {
        if (disposed) return;
        disposed = true;
        frames.Dispose();
    }

    private static RgbaGrid Sample(IMagickImage<byte> image, int width, int height, CancellationToken cancellationToken)
    {
        return new RgbaGrid(width, height, SamplePixels(image, width, height, cancellationToken));
    }

    private static byte[] SamplePixels(IMagickImage<byte> image, int width, int height, CancellationToken cancellationToken)
    {
        using var sampled = image.Clone();
        cancellationToken.ThrowIfCancellationRequested();
        if (cancellationToken.CanBeCanceled)
            sampled.Progress += (_, progress) => progress.Cancel = cancellationToken.IsCancellationRequested;
        try
        {
            sampled.Resize(new MagickGeometry((uint)width, (uint)height) { IgnoreAspectRatio = true }, FilterType.Box);
        }
        catch (MagickException exception)
        {
            cancellationToken.ThrowIfCancellationRequested();
            throw new InvalidDataException("GIF frame could not be sampled.", exception);
        }
        cancellationToken.ThrowIfCancellationRequested();
        using var pixels = sampled.GetPixels();
        return pixels.ToByteArray(PixelMapping.RGBA) ?? throw new InvalidDataException("GIF frame exposed no RGBA pixels.");
    }
}

using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Animations;

internal static class GifExporter
{
    public static async Task<byte[]> ExportAsync(GifAnimation source, CharacterImageOptions options, AnimationPlaybackOptions playback,
        IProgress<int>? progress, CancellationToken cancellationToken)
    {
        try
        {
            var timeline = AnimationTimeline.Create(source.FrameDurationsMs, playback);
            using var output = new MagickImageCollection();
            foreach (var timing in timeline)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var canvas = source.ConvertFrame(timing.SourceFrameIndex, options, cancellationToken);
                var width = canvas.WidthInCells * CharacterCellGeometry.WidthInPixels;
                var height = canvas.HeightInCells * CharacterCellGeometry.HeightInPixels;
                if ((long)width * height * timeline.Count > AnimationLimits.MaxExportPixels)
                    throw new InvalidDataException("GIF exceeds the 128-million exported-pixel limit. Choose fewer columns or a lower FPS.");
                var rgb = CanvasRasterizer.Render(canvas, MagickGlyphRenderer.Render, cancellationToken);
                var image = new MagickImage();
                try
                {
                    image.ReadPixels(rgb, new PixelReadSettings((uint)width, (uint)height, StorageType.Char, PixelMapping.RGB));
                    image.ColorSpace = ColorSpace.sRGB;
                    image.AnimationDelay = (uint)(timing.FrameDurationMs / 10);
                    image.AnimationIterations = (uint)source.Iterations;
                    image.GifDisposeMethod = GifDisposeMethod.None;
                    image.Progress += (_, step) => step.Cancel = cancellationToken.IsCancellationRequested;
                    output.Add(image);
                }
                catch
                {
                    image.Dispose();
                    throw;
                }
                progress?.Report(output.Count);
            }
            // One palette and deterministic nearest-color mapping avoid frame-local color churn.
            output.Quantize(new QuantizeSettings { Colors = 256, DitherMethod = DitherMethod.No });
            cancellationToken.ThrowIfCancellationRequested();
            using var destination = new MemoryStream();
            await output.WriteAsync(destination, MagickFormat.Gif, cancellationToken);
            cancellationToken.ThrowIfCancellationRequested();
            if (destination.Length > AnimationLimits.MaxEncodedExportBytes)
                throw new InvalidDataException("Encoded GIF exceeds the 64 MiB download limit. Choose fewer columns or a lower FPS.");
            return destination.ToArray();
        }
        catch (MagickException exception)
        {
            cancellationToken.ThrowIfCancellationRequested();
            throw new InvalidDataException("GIF could not be encoded.", exception);
        }
    }
}

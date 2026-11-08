using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Videos;

internal static class VideoFrameConverter
{
    public static byte[] Render(byte[] rgba, VideoMetadata metadata, CharacterImageOptions options, CancellationToken token)
    {
        using var image = new MagickImage();
        image.ReadPixels(rgba, new PixelReadSettings((uint)metadata.WidthInPixels, (uint)metadata.HeightInPixels, StorageType.Char, PixelMapping.RGBA));
        image.ColorSpace = ColorSpace.sRGB;
        var height = ImageGridGeometry.CalculateOutputHeight(image.Width, image.Height, options.OutputWidthInCells,
            CharacterCellGeometry.AspectRatio, ConversionLimits.Default.MaxGridCells);
        var grid = Sample(options.OutputWidthInCells, height);
        var photo = options.SourcePhotoOpacity > 0
            ? Sample(options.OutputWidthInCells * CharacterCellGeometry.WidthInPixels, height * CharacterCellGeometry.HeightInPixels) : null;
        var canvas = CharacterImagePipeline.Convert(new RgbaGrid(options.OutputWidthInCells, height, grid), options, photo, new LuminanceRange(0, 1), token);
        return CanvasRasterizer.Render(canvas, MagickGlyphRenderer.Render, token);

        byte[] Sample(int width, int sampleHeight)
        {
            token.ThrowIfCancellationRequested();
            using var sampled = image.Clone();
            sampled.Resize(new MagickGeometry((uint)width, (uint)sampleHeight) { IgnoreAspectRatio = true }, FilterType.Box);
            using var pixels = sampled.GetPixels();
            return pixels.ToByteArray(PixelMapping.RGBA) ?? throw new InvalidDataException("Video frame exposed no pixels.");
        }
    }
}

using Ascii4Fun.Images;
using ImageMagick;
using ImageMagick.Formats;

namespace Ascii4Fun.Rendering;

/// <summary> Renders a canvas to PNG with bundled fonts and fixed cell geometry. </summary>
public static class PngExporter
{
    /// <summary> The exported cell width in pixels, independent of preview zoom. </summary>
    public const int CellWidthInPixels = CharacterCellGeometry.WidthInPixels;

    /// <summary> The exported cell height in pixels. </summary>
    public const int CellHeightInPixels = CharacterCellGeometry.HeightInPixels;

    /// <summary> Exports the existing canvas without decoding or choosing glyphs again. </summary>
    /// <param name="canvas">The immutable conversion result.</param>
    /// <param name="cancellationToken">Stops rendering between rows and cancels output encoding.</param>
    /// <returns>PNG bytes with the canvas background.</returns>
    /// <exception cref="InvalidDataException">The PNG would exceed the output bounds.</exception>
    public static async Task<byte[]> ExportAsync(AsciiCanvas canvas, CancellationToken cancellationToken = default)
    {
        var rgb = CanvasRasterizer.Render(canvas, MagickGlyphRenderer.Render, cancellationToken);
        var width = canvas.WidthInCells * CellWidthInPixels;
        var height = canvas.HeightInCells * CellHeightInPixels;

        using var image = new MagickImage();
        image.ReadPixels(rgb, new PixelReadSettings((uint)width, (uint)height, StorageType.Char, PixelMapping.RGB));
        image.ColorSpace = ColorSpace.sRGB;
        image.Settings.SetDefines(new PngWriteDefines { ExcludeChunks = PngChunkFlags.date });
        using var output = new MemoryStream();
        await image.WriteAsync(output, MagickFormat.Png, cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();
        return output.ToArray();
    }

}

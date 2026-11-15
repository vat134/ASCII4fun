using System.Text;
using Ascii4Fun.Images;
using ImageMagick;
using ImageMagick.Drawing;

namespace Ascii4Fun.Rendering;

internal static class MagickGlyphRenderer
{
    // Bundled font/metrics and the Photo alphabet are immutable. Calibration is not frame work.
    private static readonly Lazy<PhotoGlyphMap> photoGlyphs = new(() => PhotoGlyphMap.Create(Render, default));
    public static PhotoGlyphMap PhotoGlyphs => photoGlyphs.Value;
    public static byte[] Render(Rune glyph)
    {
        var settings = GlyphRenderSettings.For(glyph);
        var fontPath = Path.Combine(AppContext.BaseDirectory, "rendering", "fonts", settings.FontName);
        var drawing = new Drawables()
            .Font(fontPath)
            .FontPointSize(settings.PointSize)
            .TextEncoding(Encoding.UTF8)
            .FillColor(MagickColors.White)
            .StrokeColor(MagickColors.None);
        var metrics = drawing.FontTypeMetrics(glyph.ToString())
            ?? throw new InvalidDataException("The bundled font did not provide glyph metrics.");
        // Wide Unicode glyphs are fitted inside their own cell; zero-advance marks keep their origin.
        var scaleX = metrics.TextWidth > 0 ? CharacterCellGeometry.WidthInPixels / metrics.TextWidth : 1;
        using var tile = new MagickImage(MagickColors.Transparent, CharacterCellGeometry.WidthInPixels, CharacterCellGeometry.HeightInPixels);
        drawing.Affine(scaleX, 1, 0, 0, 0, 0)
            .Text(0, settings.BaselineInPixels, glyph.ToString())
            .Draw(tile);
        using var pixels = tile.GetPixels();
        var rgba = pixels.ToByteArray(PixelMapping.RGBA)
            ?? throw new InvalidDataException("The glyph renderer did not expose RGBA pixels.");
        var mask = new byte[CharacterCellGeometry.WidthInPixels * CharacterCellGeometry.HeightInPixels];
        for (var index = 0; index < mask.Length; index++)
        {
            mask[index] = rgba[(index * 4) + 3];
        }

        return mask;
    }

}

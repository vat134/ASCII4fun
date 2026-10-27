using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Media;
using ImageMagick;
using ImageMagick.Drawing;
using ImageMagick.Formats;

namespace Ascii4Fun.Rendering;

/// <summary>Renders a canvas to PNG with bundled fonts and fixed dark-background geometry.</summary>
public static class PngExporter
{
    /// <summary>Gets the exported cell width in pixels, independent of preview zoom.</summary>
    public const int CellWidthInPixels = 12;

    /// <summary>Gets the exported cell height in pixels.</summary>
    public const int CellHeightInPixels = 24;

    private const int BackgroundChannel = 8;

    /// <summary>Exports the existing canvas without decoding or choosing glyphs again.</summary>
    /// <param name="canvas">The immutable conversion result.</param>
    /// <param name="cancellationToken">Stops rendering between rows and cancels output encoding.</param>
    /// <returns>PNG bytes with opaque background #080808.</returns>
    /// <exception cref="InvalidDataException">The PNG would exceed the output bounds.</exception>
    public static async Task<byte[]> ExportAsync(AsciiCanvas canvas, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(canvas);
        cancellationToken.ThrowIfCancellationRequested();
        var width = checked(canvas.WidthInCells * CellWidthInPixels);
        var height = checked(canvas.HeightInCells * CellHeightInPixels);
        var maxOutputPixels = (long)ConversionLimits.Default.MaxGridCells * CellWidthInPixels * CellHeightInPixels;
        if ((long)width * height > maxOutputPixels)
        {
            throw new InvalidDataException($"PNG exceeds the current {maxOutputPixels:N0}-pixel grid limit. Reduce output width.");
        }

        var rgb = new byte[checked(width * height * 3)];
        Array.Fill(rgb, (byte)BackgroundChannel);
        var masks = new Dictionary<Rune, byte[]>();
        for (var index = 0; index < canvas.Cells.Count; index++)
        {
            if (index % canvas.WidthInCells == 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
            }

            var cell = canvas.Cells[index];
            if (cell.Glyph.Value == ' ')
            {
                continue;
            }

            if (!masks.TryGetValue(cell.Glyph, out var mask))
            {
                mask = RenderGlyph(cell.Glyph);
                masks.Add(cell.Glyph, mask);
            }

            var originX = (index % canvas.WidthInCells) * CellWidthInPixels;
            var originY = (index / canvas.WidthInCells) * CellHeightInPixels;
            for (var y = 0; y < CellHeightInPixels; y++)
            {
                for (var x = 0; x < CellWidthInPixels; x++)
                {
                    var coverage = mask[(y * CellWidthInPixels) + x];
                    var offset = (((originY + y) * width) + originX + x) * 3;
                    rgb[offset] = Blend(cell.Color.Red, coverage);
                    rgb[offset + 1] = Blend(cell.Color.Green, coverage);
                    rgb[offset + 2] = Blend(cell.Color.Blue, coverage);
                }
            }
        }

        using var image = new MagickImage();
        image.ReadPixels(rgb, new PixelReadSettings((uint)width, (uint)height, StorageType.Char, PixelMapping.RGB));
        image.ColorSpace = ColorSpace.sRGB;
        image.Settings.SetDefines(new PngWriteDefines { ExcludeChunks = PngChunkFlags.date });
        using var output = new MemoryStream();
        await image.WriteAsync(output, MagickFormat.Png, cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();
        return output.ToArray();
    }

    private static byte[] RenderGlyph(Rune glyph)
    {
        var fontName = glyph.IsAscii ? "ibm-plex-mono-regular.ttf" : glyph.IsBmp ? "unifont.otf" : "unifont-upper.otf";
        var fontPath = Path.Combine(AppContext.BaseDirectory, "rendering", "fonts", fontName);
        var drawing = new Drawables()
            .Font(fontPath)
            .FontPointSize(glyph.IsAscii ? 20 : CellHeightInPixels)
            .TextEncoding(Encoding.UTF8)
            .FillColor(MagickColors.White)
            .StrokeColor(MagickColors.None);
        var metrics = drawing.FontTypeMetrics(glyph.ToString())
            ?? throw new InvalidDataException("The bundled font did not provide glyph metrics.");
        // Wide Unicode glyphs are fitted inside their own cell; zero-advance marks keep their origin.
        var scaleX = metrics.TextWidth > 0 ? CellWidthInPixels / metrics.TextWidth : 1;
        using var tile = new MagickImage(MagickColors.Transparent, CellWidthInPixels, CellHeightInPixels);
        drawing.Affine(scaleX, 1, 0, 0, 0, 0)
            .Text(0, glyph.IsAscii ? 19 : 21, glyph.ToString())
            .Draw(tile);
        using var pixels = tile.GetPixels();
        var rgba = pixels.ToByteArray(PixelMapping.RGBA)
            ?? throw new InvalidDataException("The glyph renderer did not expose RGBA pixels.");
        var mask = new byte[CellWidthInPixels * CellHeightInPixels];
        for (var index = 0; index < mask.Length; index++)
        {
            mask[index] = rgba[(index * 4) + 3];
        }

        return mask;
    }

    private static byte Blend(byte foreground, byte coverage) =>
        (byte)(((foreground * coverage) + (BackgroundChannel * (byte.MaxValue - coverage)) + 127) / byte.MaxValue);
}

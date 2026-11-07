using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Media;

namespace Ascii4Fun.Rendering;

internal static class CanvasRasterizer
{
    public static byte[] Render(AsciiCanvas canvas, Func<Rune, byte[]> renderGlyph, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(canvas);
        cancellationToken.ThrowIfCancellationRequested();
        var width = checked(canvas.WidthInCells * CharacterCellGeometry.WidthInPixels);
        var height = checked(canvas.HeightInCells * CharacterCellGeometry.HeightInPixels);
        var maxOutputPixels = (long)ConversionLimits.Default.MaxGridCells * CharacterCellGeometry.WidthInPixels * CharacterCellGeometry.HeightInPixels;
        if ((long)width * height > maxOutputPixels)
        {
            throw new InvalidDataException($"PNG exceeds the current {maxOutputPixels:N0}-pixel grid limit. Reduce output width.");
        }

        var rgb = new byte[checked(width * height * 3)];
        for (var offset = 0; offset < rgb.Length; offset += 3)
        {
            rgb[offset] = canvas.BackgroundColor.Red;
            rgb[offset + 1] = canvas.BackgroundColor.Green;
            rgb[offset + 2] = canvas.BackgroundColor.Blue;
        }
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
                mask = renderGlyph(cell.Glyph);
                masks.Add(cell.Glyph, mask);
            }

            var originX = (index % canvas.WidthInCells) * CharacterCellGeometry.WidthInPixels;
            var originY = (index / canvas.WidthInCells) * CharacterCellGeometry.HeightInPixels;
            for (var y = 0; y < CharacterCellGeometry.HeightInPixels; y++)
            {
                for (var x = 0; x < CharacterCellGeometry.WidthInPixels; x++)
                {
                    var coverage = mask[(y * CharacterCellGeometry.WidthInPixels) + x];
                    var offset = (((originY + y) * width) + originX + x) * 3;
                    rgb[offset] = Blend(cell.Color.Red, canvas.BackgroundColor.Red, coverage);
                    rgb[offset + 1] = Blend(cell.Color.Green, canvas.BackgroundColor.Green, coverage);
                    rgb[offset + 2] = Blend(cell.Color.Blue, canvas.BackgroundColor.Blue, coverage);
                }
            }
        }

        return rgb;
    }

    private static byte Blend(byte foreground, byte background, byte coverage) =>
        (byte)(((foreground * coverage) + (background * (byte.MaxValue - coverage)) + 127) / byte.MaxValue);
}

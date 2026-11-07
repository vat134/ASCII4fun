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
        for (var y = 0; y < height; y++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var rowEnd = (y + 1) * width * 3;
            for (var offset = y * width * 3; offset < rowEnd; offset += 3)
            {
                rgb[offset] = canvas.BackgroundColor.Red;
                rgb[offset + 1] = canvas.BackgroundColor.Green;
                rgb[offset + 2] = canvas.BackgroundColor.Blue;
                if (canvas.SourcePhotoRgba is { } photo)
                {
                    var photoOffset = offset / 3 * 4;
                    var coverage = (byte)((photo[photoOffset + 3] * canvas.SourcePhotoOpacity + 50) / 100);
                    rgb[offset] = Blend(photo[photoOffset], rgb[offset], coverage);
                    rgb[offset + 1] = Blend(photo[photoOffset + 1], rgb[offset + 1], coverage);
                    rgb[offset + 2] = Blend(photo[photoOffset + 2], rgb[offset + 2], coverage);
                }
            }
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
                    rgb[offset] = Blend(cell.Color.Red, rgb[offset], coverage);
                    rgb[offset + 1] = Blend(cell.Color.Green, rgb[offset + 1], coverage);
                    rgb[offset + 2] = Blend(cell.Color.Blue, rgb[offset + 2], coverage);
                }
            }
        }

        return rgb;
    }

    private static byte Blend(byte foreground, byte background, byte coverage) =>
        (byte)(((foreground * coverage) + (background * (byte.MaxValue - coverage)) + 127) / byte.MaxValue);
}

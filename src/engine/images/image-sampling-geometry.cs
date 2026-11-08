namespace Ascii4Fun.Images;

internal static class ImageSamplingGeometry
{
    public static (int Columns, int Rows) Scale(ImageStyle style) => style switch
    {
        ImageStyle.Characters => (1, 1),
        ImageStyle.Braille => (2, 4),
        _ => throw new ArgumentOutOfRangeException(nameof(style), style, "Unknown image style.")
    };

    public static (int WidthInCells, int HeightInCells) OutputSize(int widthInPixels, int heightInPixels, ImageStyle style)
    {
        var (columns, rows) = Scale(style);
        if (widthInPixels < 1 || heightInPixels < 1 || widthInPixels % columns != 0 || heightInPixels % rows != 0)
            throw new ArgumentException("The sampled image must contain complete glyph cells.");
        return (widthInPixels / columns, heightInPixels / rows);
    }
}

using System.Globalization;

namespace Ascii4Fun.Images;

/// <summary> An opaque color with 8-bit sRGB channels. </summary>
/// <param name="Red">Red channel.</param>
/// <param name="Green">Green channel.</param>
/// <param name="Blue">Blue channel.</param>
public readonly record struct RgbColor(byte Red, byte Green, byte Blue)
{
    /// <summary> Parses an opaque sRGB color in #RRGGBB notation. </summary>
    /// <exception cref="ArgumentException">The color is not exactly #RRGGBB.</exception>
    public static RgbColor ParseHex(string value)
    {
        if (value is null || value.Length != 7 || value[0] != '#'
            || !uint.TryParse(value.AsSpan(1), NumberStyles.AllowHexSpecifier, CultureInfo.InvariantCulture, out var rgb))
        {
            throw new ArgumentException("Use a color in #RRGGBB notation.", nameof(value));
        }

        return new RgbColor((byte)(rgb >> 16), (byte)(rgb >> 8), (byte)rgb);
    }

    /// <summary> Formats this color as #RRGGBB. </summary>
    public string ToHex() => $"#{Red:X2}{Green:X2}{Blue:X2}";
}

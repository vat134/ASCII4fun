using System.Text;

namespace Ascii4Fun.Rendering;

internal readonly record struct GlyphRenderSettings(string FontName, int PointSize, int BaselineInPixels)
{
    public static GlyphRenderSettings For(Rune glyph) => glyph switch
    {
        // Unifont outlines unraised Braille positions, which adds visible marks to dot art.
        { Value: >= 0x2800 and <= 0x28ff } => new("noto-sans-symbols-2-regular.ttf", 24, 18),
        { IsAscii: true } => new("ibm-plex-mono-regular.ttf", 20, 19),
        { IsBmp: true } => new("unifont.otf", CharacterCellGeometry.HeightInPixels, 21),
        _ => new("unifont-upper.otf", CharacterCellGeometry.HeightInPixels, 21)
    };
}

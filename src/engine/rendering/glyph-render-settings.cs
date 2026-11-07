using System.Text;

namespace Ascii4Fun.Rendering;

internal readonly record struct GlyphRenderSettings(string FontName, int PointSize, int BaselineInPixels)
{
    public static GlyphRenderSettings For(Rune glyph) => glyph switch
    {
        { IsAscii: true } => new("ibm-plex-mono-regular.ttf", 20, 19),
        { IsBmp: true } => new("unifont.otf", CharacterCellGeometry.HeightInPixels, 21),
        _ => new("unifont-upper.otf", CharacterCellGeometry.HeightInPixels, 21)
    };
}

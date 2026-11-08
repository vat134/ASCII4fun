using System.Text;

namespace Ascii4Fun.Images;

/// <summary> A glyph and its opaque sRGB colors. </summary>
/// <param name="Glyph">The Unicode scalar occupying this cell.</param>
/// <param name="Color">The foreground color; spaces still occupy a cell.</param>
/// <param name="BackgroundColor">An authored cell background, or null to use the canvas composition.</param>
public readonly record struct AsciiCell(Rune Glyph, RgbColor Color, RgbColor? BackgroundColor = null);

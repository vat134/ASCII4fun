using System.Text;
using Ascii4Fun.Images;

namespace Ascii4Fun.Figlet;

internal static class ThedrawRenderer
{
    private const int SpaceWidthInCells = 4;

    internal static AsciiCanvas Render(string text, ThedrawFont font, RgbColor? foregroundColor, CancellationToken cancellationToken)
    {
        var lines = new List<AsciiCell[][]>();
        var width = 1;
        var height = 0;
        var empty = new AsciiCell(new Rune(' '), foregroundColor ?? new RgbColor(170, 170, 170));
        foreach (var line in TextInput.Lines(text))
        {
            var letters = new List<AsciiCell[][]>();
            foreach (var rune in line.EnumerateRunes())
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (rune.Value == ' ') { letters.Add([]); continue; }
                // TheDraw's authored alphabets commonly contain uppercase lettering only.
                if (!font.Glyphs.TryGetValue(rune.Value, out var glyph) || glyph.All(row => row.Length == 0))
                {
                    if (rune.Value is < 'a' or > 'z' || !font.Glyphs.TryGetValue(Rune.ToUpperInvariant(rune).Value, out glyph) || glyph.All(row => row.Length == 0))
                        throw new ArgumentException($"The selected font has no glyph for U+{rune.Value:X4}.", nameof(text));
                }
                letters.Add(glyph);
            }
            var lineHeight = Math.Max(1, letters.Select(g => g.Length).DefaultIfEmpty(0).Max());
            var lineWidth = Math.Max(1, letters.Sum(GlyphWidthInCells) + Math.Max(0, letters.Count - 1) * font.LetterSpacingInCells);
            height += lineHeight;
            width = Math.Max(width, lineWidth);
            TextInput.ValidateOutput(width, height);
            var rows = Enumerable.Range(0, lineHeight).Select(_ => Enumerable.Repeat(empty, lineWidth).ToArray()).ToArray();
            var origin = 0;
            foreach (var glyph in letters)
            {
                for (var y = 0; y < glyph.Length; y++)
                    for (var x = 0; x < glyph[y].Length; x++)
                        rows[y][origin + x] = foregroundColor is { } color ? glyph[y][x] with { Color = color } : glyph[y][x];
                origin += GlyphWidthInCells(glyph) + font.LetterSpacingInCells;
            }
            lines.Add(rows);
        }
        var cells = Enumerable.Repeat(empty, width * height).ToArray();
        var outputRow = 0;
        foreach (var rows in lines)
            foreach (var row in rows)
            {
                cancellationToken.ThrowIfCancellationRequested();
                row.CopyTo(cells, outputRow++ * width);
            }
        return new AsciiCanvas(cells, width, height);
    }

    private static int GlyphWidthInCells(AsciiCell[][] glyph) =>
        glyph.Length == 0 ? SpaceWidthInCells : glyph.Max(row => row.Length);
}

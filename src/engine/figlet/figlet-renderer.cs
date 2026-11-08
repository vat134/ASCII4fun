using System.Text;
using Ascii4Fun.Images;

namespace Ascii4Fun.Figlet;

internal static class FigletRenderer
{
    private static readonly Rune Space = new(' ');

    internal static AsciiCanvas Render(string text, Figfont font, RgbColor foregroundColor, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var inputLines = TextInput.Lines(text);
        var height = inputLines.Length * font.HeightInCells;
        var lines = new List<Rune[][]>();
        var width = 1;
        foreach (var line in inputLines)
        {
            var rows = Enumerable.Range(0, font.HeightInCells).Select(_ => Array.Empty<Rune>()).ToArray();
            foreach (var rune in line.EnumerateRunes())
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (!font.Glyphs.TryGetValue(rune.Value, out var glyph) || glyph.All(row => row.Length == 0))
                    throw new ArgumentException($"The selected font has no glyph for U+{rune.Value:X4}.", nameof(text));
                var left = font.RightToLeft ? glyph : rows;
                var right = font.RightToLeft ? rows : glyph;
                var overlap = GetOverlap(left, right, font);
                var nextWidth = left.Zip(right, (a, b) => a.Length + b.Length - overlap).Max();
                TextInput.ValidateOutput(nextWidth, height);
                rows = Join(left, right, overlap, font);
            }
            width = Math.Max(width, rows.Max(row => row.Length));
            lines.Add(rows);
        }

        var cells = new AsciiCell[width * height];
        Array.Fill(cells, new AsciiCell(Space, foregroundColor));
        for (var line = 0; line < lines.Count; line++)
            for (var row = 0; row < font.HeightInCells; row++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                for (var column = 0; column < lines[line][row].Length; column++)
                {
                    var glyph = lines[line][row][column];
                    cells[(line * font.HeightInCells + row) * width + column] =
                        new AsciiCell(glyph == font.Hardblank ? Space : glyph, foregroundColor);
                }
            }
        return new AsciiCanvas(cells, width, height);
    }

    private static int GetOverlap(Rune[][] left, Rune[][] right, Figfont font)
    {
        if ((font.Layout & (FigletSmushing.HorizontalFitting | FigletSmushing.HorizontalSmushing)) == 0)
            return 0;
        var overlap = Math.Min(left.Min(row => row.Length), right.Min(row => row.Length));
        for (var row = 0; row < left.Length; row++)
        {
            var leftEnd = left[row].Length - 1;
            while (leftEnd >= 0 && left[row][leftEnd] == Space)
                leftEnd--;
            var rightStart = 0;
            while (rightStart < right[row].Length && right[row][rightStart] == Space)
                rightStart++;
            var rowOverlap = left[row].Length - leftEnd - 1 + rightStart;
            if (leftEnd >= 0 && rightStart < right[row].Length &&
                !((font.Layout & FigletSmushing.HorizontalRules) == 0 && (left[row][leftEnd] == font.Hardblank || right[row][rightStart] == font.Hardblank)) &&
                FigletSmushing.Merge(left[row][leftEnd], right[row][rightStart], font) is not null)
                rowOverlap++;
            overlap = Math.Min(overlap, rowOverlap);
        }
        return overlap;
    }

    private static Rune[][] Join(Rune[][] left, Rune[][] right, int overlap, Figfont font)
    {
        var rows = new Rune[left.Length][];
        for (var row = 0; row < rows.Length; row++)
        {
            var rightOffset = left[row].Length - overlap;
            var joined = new Rune[rightOffset + right[row].Length];
            left[row].CopyTo(joined, 0);
            for (var column = 0; column < right[row].Length; column++)
            {
                var destination = rightOffset + column;
                joined[destination] = column >= overlap ? right[row][column]
                    : joined[destination] == Space ? right[row][column]
                    : right[row][column] == Space ? joined[destination]
                    : FigletSmushing.Merge(joined[destination], right[row][column], font)
                        ?? throw new InvalidOperationException("FIGlet overlap contains a forbidden collision.");
            }
            rows[row] = joined;
        }
        return rows;
    }
}

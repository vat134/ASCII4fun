using Ascii4Fun.Images;

namespace Ascii4Fun.Figlet;

internal static class TextFontPalette
{
    public static IReadOnlyList<RgbColor> Extract(ThedrawFont font, CancellationToken cancellationToken)
    {
        var colors = new HashSet<RgbColor>();
        foreach (var glyph in font.Glyphs.Values)
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var cell in glyph.SelectMany(row => row))
            {
                if (cell.Glyph.Value is not (32 or 0x2800)) colors.Add(cell.Color);
                if (cell.BackgroundColor is { } background) colors.Add(background);
            }
        }
        return Array.AsReadOnly(colors.OrderBy(color => color.Red).ThenBy(color => color.Green).ThenBy(color => color.Blue).ToArray());
    }

    public static AsciiCanvas Replace(AsciiCanvas canvas, IReadOnlyDictionary<RgbColor, RgbColor>? replacements,
        Func<IReadOnlyList<RgbColor>> getPalette, CancellationToken cancellationToken)
    {
        if (replacements is not { Count: > 0 }) return canvas;
        var palette = getPalette();
        if (replacements.Count > palette.Count || replacements.Keys.Any(color => !palette.Contains(color)))
            throw new ArgumentException("Replace only colors from the font's authored palette.", nameof(replacements));
        var cells = new AsciiCell[canvas.Cells.Count];
        for (var index = 0; index < cells.Length; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var cell = canvas.Cells[index];
            cells[index] = cell with
            {
                Color = replacements.TryGetValue(cell.Color, out var ink) ? ink : cell.Color,
                BackgroundColor = cell.BackgroundColor is { } background && replacements.TryGetValue(background, out var fill)
                    ? fill : cell.BackgroundColor
            };
        }
        return new AsciiCanvas(cells, canvas.WidthInCells, canvas.HeightInCells, canvas.BackgroundColor);
    }
}

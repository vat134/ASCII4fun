using System.Text;

namespace Ascii4Fun.Images;

internal sealed class GlyphDensityMap
{
    private readonly (Rune Glyph, double Level)[] levels;

    private GlyphDensityMap((Rune Glyph, double Level)[] levels) => this.levels = levels;

    public static GlyphDensityMap Create(Rune[] ramp, Func<Rune, byte[]> renderGlyph, CancellationToken cancellationToken)
    {
        var measured = new List<(Rune Glyph, double Coverage)>();
        foreach (var glyph in ramp.Distinct())
        {
            cancellationToken.ThrowIfCancellationRequested();
            var coverage = glyph.Value is ' ' or '\u2800' ? 0 : renderGlyph(glyph).Average(value => value / 255d);
            measured.Add((glyph, coverage));
        }

        // Stable ordering keeps the first authored glyph when coverage is equal.
        var ordered = measured.OrderByDescending(item => item.Coverage).ToArray();
        var span = ordered[0].Coverage - ordered[^1].Coverage;
        return new GlyphDensityMap(ordered.Select(item => (item.Glyph,
            span == 0 ? 0 : (ordered[0].Coverage - item.Coverage) / span)).ToArray());
    }

    public Rune SelectGlyph(double luminance)
    {
        var low = 0;
        var high = levels.Length - 1;
        while (low < high)
        {
            var middle = low + ((high - low) / 2);
            if (levels[middle].Level < luminance) low = middle + 1;
            else high = middle;
        }

        if (low > 0 && luminance - levels[low - 1].Level <= levels[low].Level - luminance) low--;
        // Equal levels represent the same measured tone; use the first glyph consistently.
        while (low > 0 && levels[low - 1].Level == levels[low].Level) low--;
        return levels[low].Glyph;
    }
}

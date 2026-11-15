using System.Text;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Images;

// Spatial circle sampling follows Alex Harri / Typist; vectors are measured from our actual font masks.
internal sealed class PhotoGlyphMap
{
    public const string ToneCharacters = "@%#ox+*:. ";
    public const string StrokeCharacters = "|/\\_-=:;.,'\"()[]<>!^+*oLTY";
    public const string Characters = ToneCharacters + StrokeCharacters;
    private static readonly double[][] SampleWeights = Weights(PhotoSampleGeometry.WidthPerCell, PhotoSampleGeometry.HeightPerCell);
    private static readonly double[][] GlyphWeights = Weights(CharacterCellGeometry.WidthInPixels, CharacterCellGeometry.HeightInPixels);
    private readonly GlyphDensityMap density;
    private readonly Candidate[] candidates;
    private readonly double maximumTone;

    private PhotoGlyphMap(GlyphDensityMap density, Candidate[] candidates, double maximumTone)
    {
        this.density = density;
        this.candidates = candidates;
        this.maximumTone = maximumTone;
    }

    public static PhotoGlyphMap Create(Func<Rune, byte[]> renderGlyph, CancellationToken token)
    {
        var masks = new Dictionary<Rune, byte[]>();
        foreach (var glyph in Characters.EnumerateRunes().Distinct())
        {
            token.ThrowIfCancellationRequested();
            var mask = glyph.Value == ' ' ? new byte[CharacterCellGeometry.WidthInPixels * CharacterCellGeometry.HeightInPixels] : renderGlyph(glyph);
            if (mask.Length != CharacterCellGeometry.WidthInPixels * CharacterCellGeometry.HeightInPixels)
                throw new ArgumentException("Photo glyph masks must match the character cell.", nameof(renderGlyph));
            masks.Add(glyph, mask);
        }
        var measured = GlyphDensityMap.Create(ToneCharacters.EnumerateRunes().ToArray(), glyph => masks[glyph], token);
        var candidates = new List<Candidate>();
        var maximum = 0d;
        foreach (var (glyph, mask) in masks)
        {
            var samples = mask.Select(value => value / 255d).ToArray();
            var vector = MeasureWith(samples, GlyphWeights);
            var tone = vector.Average();
            maximum = Math.Max(maximum, tone);
            if (!StrokeCharacters.Contains(glyph.ToString(), StringComparison.Ordinal)) continue;
            Normalize(vector);
            candidates.Add(new Candidate(glyph, vector, tone));
        }
        return new PhotoGlyphMap(measured, candidates.ToArray(), Math.Max(maximum, 1d / 255));
    }

    public Rune Select(double[] vector, double ink)
    {
        var fallback = density.SelectGlyph(1 - Math.Pow(ink, 1.35));
        var range = vector.Max() - vector.Min();
        if (range < .3) return fallback;
        var maximum = vector.Max();
        var direction = new double[15];
        for (var k = 0; k < direction.Length; k++) direction[k] = vector[k] * vector[k] / maximum;
        Normalize(direction);
        var best = double.PositiveInfinity;
        var result = fallback;
        foreach (var candidate in candidates)
        {
            double cosine = 0;
            for (var k = 0; k < direction.Length; k++) cosine += direction[k] * candidate.Direction[k];
            var tone = candidate.Tone / maximumTone;
            // A stroke must fit; weak incidental texture keeps the tone glyph instead.
            if (cosine < .85 || ink - tone > .42) continue;
            var penalty = candidate.Glyph.Value is 'o' or 'L' or 'T' or 'Y' or '[' or ']' or '<' or '>' ? .05 : 0;
            var error = 2 * (1 - cosine) + .75 * (ink - tone) * (ink - tone) + penalty;
            if (error >= best) continue;
            best = error;
            result = candidate.Glyph;
        }
        return result;
    }

    public static double[] Measure(double[] samples, int width, int height)
    {
        if (width != PhotoSampleGeometry.WidthPerCell || height != PhotoSampleGeometry.HeightPerCell || samples.Length != width * height)
            throw new ArgumentException("Photo cells require a 4 by 8 sample raster.", nameof(samples));
        return MeasureWith(samples, SampleWeights);
    }

    private static double[] MeasureWith(double[] samples, double[][] weights)
    {
        var vector = new double[15];
        for (var k = 0; k < vector.Length; k++)
            for (var i = 0; i < samples.Length; i++) vector[k] += samples[i] * weights[k][i];
        return vector;
    }

    private static void Normalize(double[] vector)
    {
        double norm = 0;
        for (var k = 0; k < vector.Length; k++)
        {
            vector[k] *= k / 3 == 0 ? .3 : k / 3 == 4 ? .7 : 1;
            norm += vector[k] * vector[k];
        }
        if (norm == 0) return;
        norm = Math.Sqrt(norm);
        for (var k = 0; k < vector.Length; k++) vector[k] /= norm;
    }

    private static double[][] Weights(int width, int height)
    {
        var result = new double[15][];
        for (var k = 0; k < result.Length; k++)
        {
            var weights = new double[width * height];
            var cx = (k % 3 + .5) / 3;
            var cy = (k / 3 + .5) * 2 / 5;
            double total = 0;
            for (var y = 0; y < height; y++)
                for (var x = 0; x < width; x++)
                    for (var sy = 0; sy < 4; sy++)
                        for (var sx = 0; sx < 4; sx++)
                        {
                            var dx = (x + (sx + .5) / 4) / width - cx;
                            var dy = (y + (sy + .5) / 4) * 2 / height - cy;
                            if (dx * dx + dy * dy > .28 * .28) continue;
                            weights[y * width + x]++;
                            total++;
                        }
            for (var i = 0; i < weights.Length; i++) weights[i] /= total;
            result[k] = weights;
        }
        return result;
    }

    private sealed record Candidate(Rune Glyph, double[] Direction, double Tone);
}

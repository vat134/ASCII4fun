namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static double[] Sketch(double[] input, double[] alpha, int width, int height,
        CompactArtOptions options, double boost, CancellationToken token)
    {
        var baseline = Soft(input, alpha, width, height, options with { Invert = false, Detail = 0, Brightness = 0, Contrast = 0, Gamma = 1 }, 0, .45, token);
        var detailScale = Math.Min(1.6, options.Detail / .35);
        var ink = options.Detail > 0 ? SketchLines(baseline, width, height, detailScale, options.Brightness, token) : new double[input.Length];
        // Suppress artificial outlines where a crop extends into transparent paper.
        var top = 0d; var bottom = 0d; var left = 0d; var right = 0d;
        for (var x = 0; x < width; x++) { top += alpha[x]; bottom += alpha[(height - 1) * width + x]; }
        for (var y = 0; y < height; y++) { left += alpha[y * width]; right += alpha[y * width + width - 1]; }
        for (var y = 0; y < height; y++)
            for (var x = 0; x < width; x++)
                if ((top / width < .98 && y < 2) || (bottom / width < .98 && y >= height - 2)
                    || (left / height < .98 && x < 2) || (right / height < .98 && x >= width - 2)) ink[y * width + x] = 0;
        var target = Math.Max(.05, options.Invert ? .4 : .25);
        var tone = Soft(input, alpha, width, height, options with { Detail = Math.Min(options.Detail, .2) }, boost, target, token);
        var shift = .3 * options.Brightness * (options.Invert ? -1 : 1);
        for (var i = 0; i < tone.Length; i++) tone[i] = F(Clamp(1 - .62 * (1 - tone[i]) + shift));
        var near = new bool[input.Length];
        for (var y = 0; y < height; y++)
            for (var x = 0; x < width; x++)
            {
                if (ink[y * width + x] < .5) continue;
                for (var yy = Math.Max(0, y - 1); yy <= Math.Min(height - 1, y + 1); yy++)
                    for (var xx = Math.Max(0, x - 1); xx <= Math.Min(width - 1, x + 1); xx++) near[yy * width + xx] = true;
            }
        for (var i = 0; i < tone.Length; i++)
            if (near[i] && ink[i] < .5) tone[i] = F(!options.Invert ? tone[i] + (1 - tone[i]) * .35 : tone[i] * (1 - .35) + .35);
        var lineInk = 1.6 * Math.Pow(2, -.9 * options.Brightness);
        for (var i = 0; i < tone.Length; i++) tone[i] = F(options.Invert ? Math.Max(tone[i], Clamp(ink[i] * lineInk)) : Math.Min(tone[i], 1 - Clamp(ink[i] * lineInk)));
        return tone;
    }
}

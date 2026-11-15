namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private sealed record ToneHistogram(double[] Bins, double Total);

    private static ToneHistogram Histogram(double[] values, double[] weights)
    {
        var bins = new double[256];
        var total = 0d;
        for (var i = 0; i < values.Length; i++)
        {
            var value = values[i];
            bins[value <= 0 ? 0 : value >= 1 ? 255 : (int)(value * 255 + .5)] += weights[i];
            total += weights[i];
        }
        return new ToneHistogram(bins, total);
    }

    private static double Percentile(ToneHistogram histogram, double fraction)
    {
        var target = histogram.Total * fraction;
        var sum = 0d;
        for (var bin = 0; bin < 256; bin++) { sum += histogram.Bins[bin]; if (sum >= target) return bin / 255d; }
        return 1;
    }

    private static double Otsu(ToneHistogram histogram)
    {
        var sumAll = 0d;
        for (var bin = 0; bin < 256; bin++) sumAll += bin * histogram.Bins[bin];
        var background = 0d;
        var sumBackground = 0d;
        var best = -1d;
        var threshold = 127;
        for (var bin = 0; bin < 256; bin++)
        {
            background += histogram.Bins[bin];
            if (background <= 0) continue;
            var foreground = histogram.Total - background;
            if (foreground <= 1e-9) break;
            sumBackground += bin * histogram.Bins[bin];
            var meanBackground = sumBackground / background;
            var meanForeground = (sumAll - sumBackground) / foreground;
            var variance = background * foreground * (meanBackground - meanForeground) * (meanBackground - meanForeground);
            if (variance > best) { best = variance; threshold = bin; }
        }
        return (threshold + .5) / 255;
    }

    private static double SolveGamma(ToneHistogram histogram, double target = .4, bool flip = false)
    {
        if (histogram.Total < 1e-6) return 1;
        var lower = Math.Log(.25);
        var upper = Math.Log(4);
        for (var step = 0; step < 30; step++)
        {
            var middle = (lower + upper) / 2;
            var ink = 0d;
            for (var bin = 0; bin < 256; bin++)
                if (histogram.Bins[bin] != 0)
                {
                    var value = Math.Pow(bin / 255d, Math.Exp(middle));
                    ink += histogram.Bins[bin] * (flip ? value : 1 - value);
                }
            if ((ink / histogram.Total < target) != flip) lower = middle; else upper = middle;
        }
        return Math.Exp((lower + upper) / 2);
    }

    private static void ApplyPower(double[] output, double gamma)
    {
        if (Math.Abs(gamma - 1) < 1e-4) return;
        var lookup = new double[1026];
        for (var k = 0; k <= 1024; k++) lookup[k] = F(Math.Pow(k / 1024d, gamma));
        lookup[1025] = 1;
        for (var i = 0; i < output.Length; i++)
        {
            var x = Clamp(output[i]) * 1024;
            var k = (int)x;
            output[i] = F(lookup[k] + (lookup[k + 1] - lookup[k]) * (x - k));
        }
    }

    private static void FinishPhoto(double[] output, double[] weights, double[] saliency, double[] energy,
        double energy90, double[] photoPolarity, int width, int height, CompactArtOptions options, CancellationToken token)
    {
        var histogram = Histogram(output, weights);
        if (options.Contrast != 0 || (!options.AutoLevels && options.Brightness != 0))
        {
            var add = options.AutoLevels ? 0 : (options.Invert ? -1 : 1) * options.Brightness * .4;
            var contrast = options.Contrast < 0 ? .75 * options.Contrast : options.Contrast;
            var factor = contrast >= 0 ? 1 + 2 * contrast : 1 + contrast;
            var middle = options.AutoLevels ? Percentile(histogram, .5) : .5;
            for (var i = 0; i < output.Length; i++) output[i] = F(Clamp((output[i] - middle) * factor + middle + add));
            histogram = Histogram(output, weights);
        }
        var gamma = options.AutoLevels ? Math.Clamp(SolveGamma(histogram), .8, 1.6) : 1;
        ApplyPower(output, gamma / options.Gamma);
        for (var i = 0; i < output.Length; i++)
        {
            var s = 1 - saliency[i];
            var amount = .7 * s * s * (1 - Math.Min(1, energy[i] / energy90));
            if (amount > 0) output[i] = F(output[i] + amount * (Sigmoid((output[i] - .5) * 14) - output[i]));
            output[i] = F(Clamp((output[i] - .06) / (1 - 2 * .06)));
        }
        if (options.AutoLevels && options.Brightness != 0)
        {
            var exponent = Math.Pow(2, -1.25 * options.Brightness);
            var shift = .5 * options.Brightness;
            if (options.Invert) for (var i = 0; i < output.Length; i++) output[i] = F(1 - output[i]);
            ApplyPower(output, exponent);
            if (options.Invert) for (var i = 0; i < output.Length; i++) output[i] = F(1 - output[i]);
            for (var i = 0; i < output.Length; i++) output[i] = F(Clamp(output[i] + (options.Invert ? -shift : shift)));
        }
        if (!options.Invert) return;
        var background = BorderBackground(photoPolarity, width, height, token);
        for (var i = 0; i < output.Length; i++) output[i] = F(output[i] + background[i] * (1 - output[i]));
    }
}

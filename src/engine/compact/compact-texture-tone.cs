namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static double WeightedPercentile(double[] values, double[] weights, double fraction)
    {
        var maximum = values.Max();
        if (!(maximum > 0)) return 0;
        var histogram = new double[256];
        var total = 0d;
        var scale = 255 / maximum;
        for (var i = 0; i < values.Length; i++) { histogram[Math.Min(255, (int)(values[i] * scale))] += weights[i]; total += weights[i]; }
        var accumulated = 0d;
        for (var bin = 0; bin < 256; bin++) { accumulated += histogram[bin]; if (accumulated >= total * fraction) return (bin + .5) / scale; }
        return maximum;
    }

    private static double[] Texture(double[] input, double[] alpha, int width, int height,
        CompactArtOptions options, double boost, CancellationToken token)
    {
        var centre = CentreWeights(width, height);
        var output = Levelled(input, centre, options.AutoLevels);
        var longSide = Math.Max(width, height);
        var radius = BoxRadius(Math.Max(1, .02 * longSide));
        var blurred = (double[])output.Clone();
        BoxBlur(blurred, width, height, radius, 3, token);
        var mask = output.Select((value, i) => F(Math.Abs(value - blurred[i]))).ToArray();
        BoxBlur(mask, width, height, BoxRadius(Math.Max(1.5, .05 * longSide)), 3, token);
        var reference = Math.Max(.025, WeightedPercentile(mask, centre, .9));
        var gateScale = 1 / Math.Max(1e-3, .6 - .2);
        for (var i = 0; i < mask.Length; i++) { var u = Clamp((mask[i] / reference - .2) * gateScale); mask[i] = F(u * u * (3 - 2 * u)); }
        var detailScale = options.Detail / .35;
        var amount = Math.Min(1, .65 * Math.Min(1.4, detailScale) * (1 + .15 * boost));
        if (amount > 0 && width >= 4 && height >= 4)
        {
            var tilesX = Math.Max(1, (int)Math.Floor(4d * width / longSide + .5));
            var tilesY = Math.Max(1, (int)Math.Floor(4d * height / longSide + .5));
            var equalized = Clahe(output, width, height, tilesX, tilesY, token);
            for (var i = 0; i < output.Length; i++) output[i] = F(output[i] + (equalized[i] - output[i]) * amount * (.3 + (1 - .3) * mask[i]));
        }
        var sharpen = .5 * Math.Min(1.5, detailScale) * (1 + .6 * boost);
        if (sharpen > 0)
        {
            var baseline = (double[])output.Clone();
            BoxBlur(baseline, width, height, radius, 3, token);
            for (var i = 0; i < output.Length; i++) output[i] = F(Clamp(output[i] + Math.Clamp(sharpen * (.3 + .7 * mask[i]) * (output[i] - baseline[i]), -.25, .25)));
        }
        var weights = centre.Select((value, i) => F(value * (1 - .6 + .6 * mask[i]))).ToArray();
        var histogram = Histogram(output, weights);
        if (ContrastAround(output, options.Contrast, options.AutoLevels ? Percentile(histogram, .5) : .5, options.AutoLevels ? 0 : options.Brightness * .4)) histogram = Histogram(output, weights);
        var gamma = options.AutoLevels ? Math.Clamp(SolveGamma(histogram, Math.Min(.8, .4 * 1.12), options.Invert), .5, 2) * Math.Pow(2, -1.25 * options.Brightness) : 1;
        ApplyPower(output, gamma / options.Gamma);
        var cleanScale = 1 / Math.Max(1e-3, 1 - .66 - .04);
        for (var i = 0; i < output.Length; i++)
        {
            var k = .9 * (1 - mask[i]);
            if (k <= 0) continue;
            var value = output[i];
            if (value > .66) { var u = Clamp((value - .66) * cleanScale); output[i] = F(value + (1 - value) * k * u * u * (3 - 2 * u)); }
            else if (value < 1 - .66) { var u = Clamp((1 - .66 - value) * cleanScale); output[i] = F(value - value * k * u * u * (3 - 2 * u)); }
        }
        if (options.Invert) Invert(output, alpha);
        return output;
    }
}

namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static int BoxRadius(double sigma) => Math.Max(0, (int)Math.Floor((-1 + Math.Sqrt(1 + 4 * sigma * sigma)) / 2 + .5));

    private static double[] CentreWeights(int width, int height)
    {
        var weights = new double[width * height];
        for (var y = 0; y < height; y++)
            for (var x = 0; x < width; x++)
            {
                var dx = (x + .5) / width * 2 - 1;
                var dy = (y + .5) / height * 2 - 1;
                weights[y * width + x] = F(.25 + Math.Exp(-(dx * dx + dy * dy) * 1.5));
            }
        return weights;
    }

    private static double[] Levelled(double[] input, double[] weights, bool automatic)
    {
        var low = 0d;
        var high = 1d;
        if (automatic)
        {
            var histogram = Histogram(input, weights);
            low = Percentile(histogram, .005);
            high = Percentile(histogram, .995);
            if (histogram.Total < 1e-6 || high - low < 12d / 255) { low = 0; high = 1; }
        }
        var span = Math.Max(1e-3, high - low);
        return input.Select(value => F(Clamp((value - low) / span))).ToArray();
    }

    private static bool ContrastAround(double[] output, double contrast, double middle, double add)
    {
        var factor = contrast >= 0 ? 1 + 2 * contrast : 1 + contrast;
        if (factor == 1 && add == 0) return false;
        for (var i = 0; i < output.Length; i++) output[i] = F(Clamp((output[i] - middle) * factor + middle + add));
        return true;
    }

    private static void Invert(double[] output, double[] alpha)
    {
        for (var i = 0; i < output.Length; i++) output[i] = F(alpha[i] * output[i]);
        for (var i = 0; i < output.Length; i++) output[i] = F(1 - output[i]);
    }

    private static double[] Soft(double[] input, double[] alpha, int width, int height,
        CompactArtOptions options, double boost, double target, CancellationToken token)
    {
        var weights = CentreWeights(width, height);
        var output = Levelled(input, weights, options.AutoLevels);
        var detail = Math.Min(1.5, options.Detail + .45 * boost);
        if (detail > 0)
        {
            var baseline = (double[])output.Clone();
            BoxBlur(baseline, width, height, BoxRadius(Math.Max(1, .025 * Math.Max(width, height))), 3, token);
            var gain = detail * 1.8;
            var limit = .12 + .1 * detail;
            for (var i = 0; i < output.Length; i++) output[i] = F(Clamp(output[i] + Math.Clamp(gain * (output[i] - baseline[i]), -limit, limit)));
        }
        var histogram = Histogram(output, weights);
        var middle = options.AutoLevels ? Percentile(histogram, .5) : .5;
        if (ContrastAround(output, options.Contrast + .3 * boost, middle, options.AutoLevels ? 0 : options.Brightness * .4)) histogram = Histogram(output, weights);
        var gamma = options.AutoLevels ? SolveGamma(histogram, target, options.Invert) * Math.Pow(2, -1.25 * options.Brightness) : 1;
        ApplyPower(output, gamma / options.Gamma);
        if (options.Invert) Invert(output, alpha);
        return output;
    }
}

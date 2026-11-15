namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static double[] Poster(double[] input, double[] alpha, int width, int height,
        CompactArtOptions options, CancellationToken token)
    {
        var weights = CentreWeights(width, height);
        var output = Levelled(input, weights, options.AutoLevels);
        var smooth = (double[])output.Clone();
        BoxBlur(smooth, width, height, 1, 1, token);
        var detailScale = options.Detail / .35;
        if (detailScale > 0)
        {
            var baseline = (double[])smooth.Clone();
            BoxBlur(baseline, width, height, BoxRadius(Math.Max(1, .02 * Math.Max(width, height))), 3, token);
            var gain = .8 * Math.Min(2, detailScale);
            for (var i = 0; i < smooth.Length; i++) smooth[i] = F(Clamp(smooth[i] + gain * (smooth[i] - baseline[i])));
        }
        if (Math.Abs(options.Gamma - 1) > 1e-4) ApplyPower(smooth, 1 / options.Gamma);
        var threshold = options.AutoLevels ? Math.Clamp(Otsu(Histogram(smooth, weights)), .2, .8) : .5;
        threshold = Math.Clamp(threshold - .45 * options.Brightness, .05, .95);
        var steepness = 14 * (options.Contrast >= 0 ? 1 + 2 * options.Contrast : 1 + .7 * options.Contrast);
        for (var i = 0; i < output.Length; i++) output[i] = F(Sigmoid((smooth[i] - threshold) * steepness));
        var low = Math.Max(Sigmoid(-steepness * threshold), .12);
        var high = Math.Min(Sigmoid(steepness * (1 - threshold)), .88);
        for (var i = 0; i < output.Length; i++) output[i] = F(Clamp((output[i] - low) / Math.Max(1e-3, high - low)));
        if (options.Invert) Invert(output, alpha);
        return output;
    }
}

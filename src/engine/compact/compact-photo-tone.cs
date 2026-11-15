namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static double[] Photo(double[] input, double[] alpha, int width, int height,
        CompactArtOptions options, CancellationToken token)
    {
        var cp = new double[input.Length];
        var cp8 = new double[input.Length];
        var weights = new double[input.Length];
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            var dy = (y + .5) / height * 2 - 1;
            for (var x = 0; x < width; x++)
            {
                var i = y * width + x;
                var dx = (x + .5) / width * 2 - 1;
                cp[i] = F(Math.Exp(-(dx * dx + dy * dy) * 2));
                cp8[i] = F(Math.Exp(-(dx * dx + dy * dy) * 2 * .8));
                weights[i] = F(.2 + Math.Exp(-(dx * dx + dy * dy) * 2));
            }
        }
        var low = 0d;
        var high = 1d;
        if (options.AutoLevels)
        {
            var histogram = Histogram(input, weights);
            low = Percentile(histogram, .005);
            high = Percentile(histogram, .995);
            if (histogram.Total < 1e-6 || high - low < 12d / 255) { low = 0; high = 1; }
        }
        for (var i = 0; i < input.Length; i++) input[i] = F(Clamp((input[i] - low) / Math.Max(1e-3, high - low)));
        var photoPolarity = options.Invert ? (double[])input.Clone() : input;
        if (options.Invert) for (var i = 0; i < input.Length; i++) input[i] = F(1 - alpha[i] * input[i]);
        var boost = Clamp((36 - width / 2d) / 20);
        var radius = Math.Max(1, (int)Math.Floor(.08 * Math.Max(width, height) + .5));
        var baseline = GuidedFilter(input, width, height, radius, token);
        var detail = new double[input.Length];
        var energy = new double[input.Length];
        for (var i = 0; i < input.Length; i++) detail[i] = F(input[i] - baseline[i]);
        for (var y = 0; y < height; y++)
            for (var x = 0; x < width; x++)
            {
                var i = y * width + x;
                var gx = baseline[y * width + Math.Min(width - 1, x + 1)] - baseline[y * width + Math.Max(0, x - 1)];
                var gy = baseline[Math.Min(height - 1, y + 1) * width + x] - baseline[Math.Max(0, y - 1) * width + x];
                energy[i] = F(Math.Abs(detail[i]) + .5 * Math.Sqrt(gx * gx + gy * gy));
            }
        BoxBlur(energy, width, height, radius, 2, token);
        var energy90 = Math.Max(1e-3, Percentile(Histogram(energy, cp), .9));
        var saliency = new double[input.Length];
        for (var i = 0; i < input.Length; i++)
        {
            saliency[i] = F(Clamp(1.25 * cp8[i] * (.35 + .65 * Math.Min(1, energy[i] / energy90))));
            weights[i] = F(.08 + saliency[i]);
        }
        var middle = Math.Clamp(Otsu(Histogram(baseline, weights)), .15, .85);
        var detailScale = options.Detail / .35;
        var gain = (2.6 + 1.2 * boost) * detailScale * .35;
        var variance = detail.Select(value => F(value * value)).ToArray();
        BoxBlur(variance, width, height, radius, 1, token);
        var lookup = new double[258];
        for (var k = 0; k <= 256; k++)
        {
            var b = k / 256d;
            var sigmoid = .1 + (.95 - .1) / (1 + Math.Exp(-(b - middle) * 10));
            lookup[k] = F(b + .7 * (sigmoid - b) * Math.Min(1, Math.Min(b / .04, (1 - b) / .04)));
        }
        lookup[257] = lookup[256];
        var output = new double[input.Length];
        for (var i = 0; i < input.Length; i++)
        {
            var b = baseline[i];
            var xb = Clamp(b) * 256;
            var kb = (int)xb;
            var tb = lookup[kb] + (lookup[kb + 1] - lookup[kb]) * (xb - kb);
            var sd = variance[i] > 0 ? Math.Sqrt(variance[i]) : 0;
            var weight = .3 + (1 - .3) * saliency[i];
            tb += sd / (sd + .04) * weight * (middle + .3 * (b - middle) - tb);
            output[i] = F(Clamp(tb + .5 * Tanh(gain * weight * detail[i] / (sd + .05))));
        }
        var push = Math.Min(1.5, .6 + .4 * detailScale + .3 * boost);
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < width; x++)
            {
                var i = y * width + x;
                var min = 1d;
                var max = 0d;
                for (var yy = Math.Max(0, y - 2); yy <= Math.Min(height - 1, y + 2); yy++)
                    for (var xx = Math.Max(0, x - 2); xx <= Math.Min(width - 1, x + 2); xx++)
                    { min = Math.Min(min, input[yy * width + xx]); max = Math.Max(max, input[yy * width + xx]); }
                var range = max - min;
                if (range < .12) continue;
                var u = Clamp((Math.Abs(detail[i]) - .05) * (1 / (.16 - .05)));
                var ur = Math.Min(1, (range - .12) / (.3 - .12));
                var g = Math.Max(u * u * (3 - 2 * u), ur * ur * (3 - 2 * ur));
                var k = Math.Min(1, push * g * ur * (.5 + .5 * saliency[i]));
                output[i] = F(output[i] + k * (Sigmoid((input[i] - (min + max) * .5) / range * 8) - output[i]));
            }
        }
        FinishPhoto(output, weights, saliency, energy, energy90, photoPolarity, width, height, options, token);
        return output;
    }
}

namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static double[] Gaussian(double[] input, int width, int height, double sigma, CancellationToken token)
    {
        var radius = Math.Max(1, (int)Math.Ceiling(3 * sigma));
        var kernel = new double[2 * radius + 1];
        var sum = 0d;
        for (var i = -radius; i <= radius; i++) { kernel[i + radius] = F(Math.Exp(-(i * i) / (2 * sigma * sigma))); sum += kernel[i + radius]; }
        for (var i = 0; i < kernel.Length; i++) kernel[i] = F(kernel[i] / sum);
        var temporary = new double[input.Length];
        var output = new double[input.Length];
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < width; x++)
            {
                var accumulated = 0d;
                for (var i = -radius; i <= radius; i++) accumulated += kernel[i + radius] * input[y * width + Math.Clamp(x + i, 0, width - 1)];
                temporary[y * width + x] = F(accumulated);
            }
        }
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < width; x++)
            {
                var accumulated = 0d;
                for (var i = -radius; i <= radius; i++) accumulated += kernel[i + radius] * temporary[Math.Clamp(y + i, 0, height - 1) * width + x];
                output[y * width + x] = F(accumulated);
            }
        }
        return output;
    }

    private static double[] SketchLines(double[] baseline, int width, int height, double detailScale, double brightness, CancellationToken token)
    {
        var sigma = .7 + .004 * Math.Max(width, height);
        var fine = Gaussian(baseline, width, height, sigma, token);
        var coarse = Gaussian(baseline, width, height, sigma * 1.6, token);
        var ink = new double[baseline.Length];
        var gain = 30 * (.4 + .6 * detailScale);
        var epsilon = -.06 * (1.4 - .4 * Math.Min(1, detailScale)) - .12 * brightness;
        for (var i = 0; i < ink.Length; i++)
        {
            var value = (1 + gain) * fine[i] - gain * coarse[i];
            if (value < epsilon) ink[i] = F(-Tanh(20 * (value - epsilon)));
        }
        var keep = new bool[ink.Length];
        var stack = new int[ink.Length];
        var length = 0;
        for (var i = 0; i < ink.Length; i++) if (ink[i] >= .8) { keep[i] = true; stack[length++] = i; }
        while (length > 0)
        {
            token.ThrowIfCancellationRequested();
            var i = stack[--length];
            var x = i % width;
            var y = i / width;
            for (var yy = Math.Max(0, y - 1); yy <= Math.Min(height - 1, y + 1); yy++)
                for (var xx = Math.Max(0, x - 1); xx <= Math.Min(width - 1, x + 1); xx++)
                {
                    var next = yy * width + xx;
                    if (!keep[next] && ink[next] >= .3) { keep[next] = true; stack[length++] = next; }
                }
        }
        var labelled = new bool[ink.Length];
        var members = new int[ink.Length];
        for (var start = 0; start < ink.Length; start++)
        {
            if (!keep[start] || labelled[start]) continue;
            token.ThrowIfCancellationRequested();
            var count = 0;
            var peak = 0d;
            length = 0;
            stack[length++] = start;
            labelled[start] = true;
            while (length > 0)
            {
                var i = stack[--length];
                var x = i % width;
                var y = i / width;
                members[count++] = i;
                peak = Math.Max(peak, ink[i]);
                for (var yy = Math.Max(0, y - 1); yy <= Math.Min(height - 1, y + 1); yy++)
                    for (var xx = Math.Max(0, x - 1); xx <= Math.Min(width - 1, x + 1); xx++)
                    {
                        var next = yy * width + xx;
                        if (keep[next] && !labelled[next]) { labelled[next] = true; stack[length++] = next; }
                    }
            }
            if (count < 4 && peak < .9) for (var i = 0; i < count; i++) keep[members[i]] = false;
        }
        for (var i = 0; i < ink.Length; i++) if (!keep[i]) ink[i] = 0;
        return ink;
    }
}

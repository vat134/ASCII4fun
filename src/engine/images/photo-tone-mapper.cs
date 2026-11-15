namespace Ascii4Fun.Images;

internal static class PhotoToneMapper
{
    // A self-guided base preserves strong edges while the residual carries small features.
    public static double[] Enhance(LuminanceGrid source, CancellationToken token)
    {
        var values = source.Values;
        var radius = Math.Max(1, (int)Math.Round(.025 * Math.Max(source.WidthInPixels, source.HeightInPixels)));
        var mean = Blur(values, source.WidthInPixels, source.HeightInPixels, radius, token);
        var square = new double[values.Length];
        for (var i = 0; i < values.Length; i++) square[i] = values[i] * values[i];
        var variance = Blur(square, source.WidthInPixels, source.HeightInPixels, radius, token);
        for (var i = 0; i < values.Length; i++)
        {
            var v = Math.Max(0, variance[i] - mean[i] * mean[i]);
            square[i] = v / (v + .01);
            variance[i] = mean[i] * (1 - square[i]);
        }
        var a = Blur(square, source.WidthInPixels, source.HeightInPixels, radius, token);
        var b = Blur(variance, source.WidthInPixels, source.HeightInPixels, radius, token);
        var output = new double[values.Length];
        for (var i = 0; i < values.Length; i++)
        {
            if (i % source.WidthInPixels == 0) token.ThrowIfCancellationRequested();
            var detail = values[i] - (a[i] * values[i] + b[i]);
            // Limit amplification so weak texture and hard boundaries cannot create large halos.
            output[i] = Math.Clamp(values[i] + Math.Clamp(1.2 * detail, -.12, .12), 0, 1);
        }
        return output;
    }

    private static double[] Blur(double[] input, int width, int height, int radius, CancellationToken token)
    {
        var horizontal = new double[input.Length];
        var result = new double[input.Length];
        var divisor = 2 * radius + 1;
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            double sum = 0;
            for (var k = -radius; k <= radius; k++) sum += input[y * width + Math.Clamp(k, 0, width - 1)];
            for (var x = 0; x < width; x++)
            {
                horizontal[y * width + x] = sum / divisor;
                sum += input[y * width + Math.Clamp(x + radius + 1, 0, width - 1)]
                    - input[y * width + Math.Clamp(x - radius, 0, width - 1)];
            }
        }
        for (var x = 0; x < width; x++)
        {
            token.ThrowIfCancellationRequested();
            double sum = 0;
            for (var k = -radius; k <= radius; k++) sum += horizontal[Math.Clamp(k, 0, height - 1) * width + x];
            for (var y = 0; y < height; y++)
            {
                result[y * width + x] = sum / divisor;
                sum += horizontal[Math.Clamp(y + radius + 1, 0, height - 1) * width + x]
                    - horizontal[Math.Clamp(y - radius, 0, height - 1) * width + x];
            }
        }
        return result;
    }
}

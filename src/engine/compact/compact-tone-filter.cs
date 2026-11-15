namespace Ascii4Fun.Compact;

// Port of MIT Typist tone.js at f128e782; Copyright 2026 winch, see typist-license.txt.
internal static partial class CompactToneMapper
{
    // JS computes with doubles, then rounds every Float32Array store. Keep that distinction explicit.
    private static double F(double value) => (float)value;
    private static double Clamp(double value) => Math.Clamp(value, 0, 1);
    private static double Tanh(double value)
    {
        if (value > 3) return 1;
        if (value < -3) return -1;
        var square = value * value;
        return value * (27 + square) / (27 + 9 * square);
    }
    private static double Sigmoid(double value) => .5 + .5 * Tanh(.5 * value);

    private static void BoxBlur(double[] values, int width, int height, int radius, int passes, CancellationToken token)
    {
        if (radius < 1) return;
        var temporary = new double[values.Length];
        var inverse = 1d / (2 * radius + 1);
        for (var pass = 0; pass < passes; pass++)
        {
            for (var y = 0; y < height; y++)
            {
                token.ThrowIfCancellationRequested();
                var origin = y * width;
                var sum = values[origin] * (radius + 1);
                for (var k = 1; k <= radius; k++) sum += values[origin + Math.Min(k, width - 1)];
                for (var x = 0; x < width; x++)
                {
                    temporary[origin + x] = F(sum * inverse);
                    sum += values[origin + Math.Min(x + radius + 1, width - 1)] - values[origin + Math.Max(x - radius, 0)];
                }
            }
            var sums = new double[width];
            for (var x = 0; x < width; x++)
            {
                var sum = temporary[x] * (radius + 1);
                for (var k = 1; k <= radius; k++) sum += temporary[Math.Min(k, height - 1) * width + x];
                sums[x] = sum;
            }
            for (var y = 0; y < height; y++)
            {
                token.ThrowIfCancellationRequested();
                var add = Math.Min(y + radius + 1, height - 1) * width;
                var subtract = Math.Max(y - radius, 0) * width;
                for (var x = 0; x < width; x++)
                {
                    values[y * width + x] = F(sums[x] * inverse);
                    sums[x] += temporary[add + x] - temporary[subtract + x];
                }
            }
        }
    }

    private static double[] GuidedFilter(double[] input, int width, int height, int radius, CancellationToken token)
    {
        var mean = (double[])input.Clone();
        var squared = input.Select(value => F(value * value)).ToArray();
        BoxBlur(mean, width, height, radius, 1, token);
        BoxBlur(squared, width, height, radius, 1, token);
        var a = new double[input.Length];
        var b = new double[input.Length];
        for (var i = 0; i < input.Length; i++)
        {
            var variance = Math.Max(0, squared[i] - mean[i] * mean[i]);
            a[i] = F(variance / (variance + .06));
            b[i] = F(mean[i] - a[i] * mean[i]);
        }
        BoxBlur(a, width, height, radius, 1, token);
        BoxBlur(b, width, height, radius, 1, token);
        for (var i = 0; i < input.Length; i++) a[i] = F(a[i] * input[i] + b[i]);
        return a;
    }

    private static double[] BorderBackground(double[] input, int width, int height, CancellationToken token)
    {
        var mask = new double[input.Length];
        if (width < 6 || height < 6) return mask;
        var smooth = (double[])input.Clone();
        BoxBlur(smooth, width, height, 1, 1, token);
        var visited = new bool[input.Length];
        var stack = new int[input.Length];
        var length = 0;
        bool Flat(int index)
        {
            var x = index % width;
            var y = index / width;
            var left = smooth[y * width + Math.Max(0, x - 1)];
            var right = smooth[y * width + Math.Min(width - 1, x + 1)];
            var up = smooth[Math.Max(0, y - 1) * width + x];
            var down = smooth[Math.Min(height - 1, y + 1) * width + x];
            return Math.Abs(right - left) + Math.Abs(down - up) < 2.5 * .035;
        }
        void Seed(int index)
        {
            if (visited[index] || !Flat(index)) return;
            visited[index] = true;
            stack[length++] = index;
        }
        for (var x = 0; x < width; x++) { Seed(x); Seed((height - 1) * width + x); }
        for (var y = 0; y < height; y++) { Seed(y * width); Seed(y * width + width - 1); }
        var neighbors = new int[4];
        while (length > 0)
        {
            token.ThrowIfCancellationRequested();
            var index = stack[--length];
            var x = index % width;
            neighbors[0] = x > 0 ? index - 1 : -1;
            neighbors[1] = x < width - 1 ? index + 1 : -1;
            neighbors[2] = index - width;
            neighbors[3] = index + width;
            foreach (var neighbor in neighbors)
            {
                if (neighbor < 0 || neighbor >= input.Length || visited[neighbor]) continue;
                if (Math.Abs(smooth[neighbor] - smooth[index]) >= .035 || !Flat(neighbor)) continue;
                visited[neighbor] = true;
                stack[length++] = neighbor;
            }
        }
        var count = visited.Count(value => value);
        if (count < .03 * input.Length || count > .85 * input.Length) return mask;
        for (var i = 0; i < mask.Length; i++) mask[i] = visited[i] ? 1 : 0;
        BoxBlur(mask, width, height, 1, 1, token);
        for (var i = 0; i < mask.Length; i++) if (!visited[i]) mask[i] = 0;
        return mask;
    }
}

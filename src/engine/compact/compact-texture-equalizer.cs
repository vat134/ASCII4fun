namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static double[] Clahe(double[] input, int width, int height, int tilesX, int tilesY, CancellationToken token)
    {
        const int bins = 64;
        var tables = new double[tilesX * tilesY * (bins + 1)];
        var histogram = new double[bins];
        for (var ty = 0; ty < tilesY; ty++)
            for (var tx = 0; tx < tilesX; tx++)
            {
                token.ThrowIfCancellationRequested();
                Array.Clear(histogram);
                var count = 0;
                for (var y = ty * height / tilesY; y < (ty + 1) * height / tilesY; y++)
                    for (var x = tx * width / tilesX; x < (tx + 1) * width / tilesX; x++)
                    {
                        var value = input[y * width + x];
                        histogram[value <= 0 ? 0 : value >= 1 ? bins - 1 : Math.Min(bins - 1, (int)(value * bins))]++;
                        count++;
                    }
                var origin = (ty * tilesX + tx) * (bins + 1);
                if (count == 0) { for (var k = 0; k <= bins; k++) tables[origin + k] = F(k / (double)bins); continue; }
                var limit = Math.Max(1, 2d * count / bins);
                var excess = 0d;
                for (var k = 0; k < bins; k++)
                    if (histogram[k] > limit) { excess += histogram[k] - limit; histogram[k] = F(limit); }
                var add = excess / bins;
                var inverse = 1d / count;
                var accumulated = 0d;
                for (var k = 0; k < bins; k++) { accumulated += histogram[k] + add; tables[origin + k + 1] = F(accumulated * inverse); }
            }
        static (int Low, int High, double Fraction) Cell(double position, int count)
        {
            if (position <= 0 || count == 1) return (0, 0, 0);
            if (position >= count - 1) return (count - 1, count - 1, 0);
            var low = (int)Math.Floor(position);
            return (low, low + 1, position - low);
        }
        var output = new double[input.Length];
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            var (y0, y1, fy) = Cell((y + .5) * tilesY / height - .5, tilesY);
            for (var x = 0; x < width; x++)
            {
                var (x0, x1, fx) = Cell((x + .5) * tilesX / width - .5, tilesX);
                var position = Clamp(input[y * width + x]) * bins;
                var bin = Math.Min(bins - 1, (int)position);
                var fraction = position - bin;
                double Read(int xx, int yy)
                {
                    var origin = (yy * tilesX + xx) * (bins + 1) + bin;
                    return tables[origin] + (tables[origin + 1] - tables[origin]) * fraction;
                }
                output[y * width + x] = F((Read(x0, y0) * (1 - fx) + Read(x1, y0) * fx) * (1 - fy)
                    + (Read(x0, y1) * (1 - fx) + Read(x1, y1) * fx) * fy);
            }
        }
        return output;
    }
}

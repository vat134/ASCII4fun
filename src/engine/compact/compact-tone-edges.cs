namespace Ascii4Fun.Compact;

internal static partial class CompactToneMapper
{
    private static CompactToneMapper.EdgeField Edges(double[] input, int width, int height, CancellationToken token)
    {
        var magnitude = new double[input.Length];
        var direction = new int[input.Length];
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < width; x++)
            {
                double Read(int dx, int dy) => input[Math.Clamp(y + dy, 0, height - 1) * width + Math.Clamp(x + dx, 0, width - 1)];
                var gx = (Read(1, -1) + 2 * Read(1, 0) + Read(1, 1)) - (Read(-1, -1) + 2 * Read(-1, 0) + Read(-1, 1));
                var gy = (Read(-1, 1) + 2 * Read(0, 1) + Read(1, 1)) - (Read(-1, -1) + 2 * Read(0, -1) + Read(1, -1));
                var index = y * width + x;
                magnitude[index] = F(Math.Min(1, Math.Sqrt(gx * gx + gy * gy) / 4));
                direction[index] = Math.Abs(gy) <= .41421356 * Math.Abs(gx) ? 0
                    : Math.Abs(gx) <= .41421356 * Math.Abs(gy) ? 2 : (gx > 0) == (gy > 0) ? 1 : 3;
            }
        }
        (int X, int Y)[] offsets = [(1, 0), (1, 1), (0, 1), (-1, 1)];
        var thin = new bool[input.Length];
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < width; x++)
            {
                var index = y * width + x;
                var (dx, dy) = offsets[direction[index]];
                double Read(int xx, int yy) => xx >= 0 && xx < width && yy >= 0 && yy < height ? magnitude[yy * width + xx] : 0;
                thin[index] = magnitude[index] >= .08 && magnitude[index] >= Read(x + dx, y + dy) && magnitude[index] > Read(x - dx, y - dy);
            }
        }
        return new CompactToneMapper.EdgeField(magnitude, thin);
    }

}

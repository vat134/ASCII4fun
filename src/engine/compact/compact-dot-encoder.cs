using System.Text;

namespace Ascii4Fun.Compact;

// Adapted from MIT Typist dither.js (Copyright 2026 winch); see bundled Typist notice.
internal static class CompactDotEncoder
{
    private static readonly int[] Bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    private static readonly int[] Bits = [1, 8, 2, 16, 4, 32, 64, 128];
    private static readonly (int X, int Y, double Weight)[] Atkinson =
        [(1, 0, .125), (2, 0, .125), (-1, 1, .125), (0, 1, .125), (1, 1, .125), (0, 2, .125)];
    private static readonly (int X, int Y, double Weight)[] Floyd =
        [(1, 0, 7d / 16), (-1, 1, 3d / 16), (0, 1, 5d / 16), (1, 1, 1d / 16)];

    internal static Rune[] Encode(double[] lightness, int width, int height, string method,
        CancellationToken token = default) => Encode(lightness, width, height, method, null, 0, null, token);

    internal static Rune[] Encode(double[] lightness, int width, int height, string method,
        CompactToneMapper.EdgeField? edge, double edges, bool[]? transparentSamples = null, CancellationToken token = default)
    {
        ArgumentNullException.ThrowIfNull(lightness);
        token.ThrowIfCancellationRequested();
        ValidateShape(width, height, lightness.Length);
        if (transparentSamples is not null && transparentSamples.Length != lightness.Length)
            throw new ArgumentException("Transparency must match the compact sample grid.", nameof(transparentSamples));
        if (method is not ("atkinson" or "floyd" or "bayer" or "threshold"))
            throw new ArgumentException("Choose a supported dot dithering method.", nameof(method));
        foreach (var value in lightness)
            if (!double.IsFinite(value) || value is < 0 or > 1) throw new ArgumentOutOfRangeException(nameof(lightness));
        var dots = new bool[lightness.Length];
        var buffer = method is "atkinson" or "floyd" ? lightness.Select(value => (double)(float)(1 - value)).ToArray() : null;
        var kernel = method == "floyd" ? Floyd : Atkinson;
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            var direction = (y & 1) == 0 ? 1 : -1;
            for (var n = 0; n < width; n++)
            {
                var x = direction == 1 ? n : width - 1 - n;
                var index = y * width + x;
                if (buffer is null)
                {
                    dots[index] = method == "bayer"
                        ? 1 - lightness[index] > (Bayer[(y & 3) * 4 + (x & 3)] + .5) / 16
                        : lightness[index] <= .5;
                    continue;
                }
                var value = Math.Clamp(buffer[index], -.5, 1.5);
                dots[index] = value >= .5;
                var error = (value - (dots[index] ? 1 : 0)) * (1 - (edge?.Magnitude[index] ?? 0));
                foreach (var (dx, dy, weight) in kernel)
                {
                    var xx = x + direction * dx;
                    var yy = y + dy;
                    if (xx >= 0 && xx < width && yy < height) buffer[yy * width + xx] = (float)(buffer[yy * width + xx] + error * weight);
                }
            }
        }
        if (buffer is not null) Clean(dots, lightness, width, height, token);
        if (edge is not null && edges > 0)
            for (var i = 0; i < dots.Length; i++)
                if (edge.Thin[i] && edge.Magnitude[i] > .55 - .45 * edges) dots[i] = true;
        // Source transparency wins over diffusion, cleanup and edge emphasis at the final dot boundary.
        // This is input alpha, never inferred background segmentation.
        if (transparentSamples is not null)
            for (var i = 0; i < dots.Length; i++)
                if (transparentSamples[i]) dots[i] = false;
        var glyphs = new Rune[width / 2 * (height / 4)];
        for (var row = 0; row < height / 4; row++)
        {
            token.ThrowIfCancellationRequested();
            for (var column = 0; column < width / 2; column++)
            {
                var bits = 0;
                for (var y = 0; y < 4; y++)
                    for (var x = 0; x < 2; x++)
                        if (dots[(row * 4 + y) * width + column * 2 + x]) bits |= Bits[y * 2 + x];
                // Clean blanks retain geometry and use U+2800, never a visible substitute dot.
                glyphs[row * (width / 2) + column] = new Rune(0x2800 + bits);
            }
        }
        return glyphs;
    }

    internal static void ValidateShape(int width, int height, int count)
    {
        // Public compact geometry is at most 200 columns; bound intermediate allocations as well.
        if (width <= 0 || height <= 0 || width % 2 != 0 || height % 4 != 0 || width > 400
            || (long)width * height > CompactArtGeometry.MaxCells * 8L || (long)width * height != count)
            throw new ArgumentException("Compact samples must form a bounded 2 by 4 dot grid.");
    }

    private static void Clean(bool[] dots, double[] lightness, int width, int height, CancellationToken token)
    {
        var source = (bool[])dots.Clone();
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < width; x++)
            {
                var index = y * width + x;
                var ink = 1 - lightness[index];
                if (source[index] ? ink > .3 : ink < .7) continue;
                var on = 0;
                var count = 0;
                for (var yy = Math.Max(0, y - 1); yy <= Math.Min(height - 1, y + 1); yy++)
                    for (var xx = Math.Max(0, x - 1); xx <= Math.Min(width - 1, x + 1); xx++)
                    {
                        if (xx == x && yy == y) continue;
                        count++;
                        if (source[yy * width + xx]) on++;
                    }
                if (source[index] && on == 0) dots[index] = false;
                else if (!source[index] && on == count) dots[index] = true;
            }
        }
    }
}

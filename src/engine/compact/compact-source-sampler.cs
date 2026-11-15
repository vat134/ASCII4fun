using Ascii4Fun.Media;

namespace Ascii4Fun.Compact;

// MIT Typist tone.js areaDown/buildSat/sampleDecoded port; see typist-license.txt.
// ImageMagick supplies normalized decoded bytes; this analysis preserves sub-byte lightness.
internal static class CompactSourceSampler
{
    internal sealed record Samples(double[] Lightness, double[] Alpha, int Width, int Height);

    internal static Samples Sample(RgbaGrid source, CompactArtLayout layout, CompactArtOptions options, CancellationToken token)
    {
        var decoded = Downscale(source, token);
        var w = decoded.WidthInPixels;
        var h = decoded.HeightInPixels;
        var stride = w + 1;
        var luma = new double[stride * (h + 1)];
        var alpha = new double[luma.Length];
        for (var y = 0; y < h; y++)
        {
            token.ThrowIfCancellationRequested();
            var ry = 0d;
            var ra = 0d;
            for (var x = 0; x < w; x++)
            {
                var p = (y * w + x) * 4;
                var a = decoded.Pixels[p + 3];
                ry += Math.Floor((.2126 * decoded.Pixels[p] + .7152 * decoded.Pixels[p + 1] + .0722 * decoded.Pixels[p + 2]) * a * (16d / 255) + .5);
                ra += a * 16;
                luma[(y + 1) * stride + x + 1] = luma[y * stride + x + 1] + ry;
                alpha[(y + 1) * stride + x + 1] = alpha[y * stride + x + 1] + ra;
            }
        }
        var (_, _, sideX, sideY) = CompactArtGeometry.Crop(w, h, options);
        var cx = options.CropX * w;
        var cy = options.CropY * h;
        var width = layout.SampleWidthInPixels;
        var height = layout.SampleHeightInPixels;
        var hx = sideX / width / 2;
        var hy = sideY / height / 2;
        var fx = Math.Max(hx, .5);
        var fy = Math.Max(hy, .5);
        var output = new double[width * height];
        var opacity = new double[output.Length];
        for (var y = 0; y < height; y++)
        {
            token.ThrowIfCancellationRequested();
            var py = cy + ((y + .5) / height - .5) * sideY;
            for (var x = 0; x < width; x++)
            {
                var i = y * width + x;
                var px = cx + ((x + .5) / width - .5) * sideX;
                var covX = px - hx >= 0 && px + hx <= w ? 1 : (Math.Min(px + hx, w) - Math.Max(px - hx, 0)) / (2 * hx);
                var covY = py - hy >= 0 && py + hy <= h ? 1 : (Math.Min(py + hy, h) - Math.Max(py - hy, 0)) / (2 * hy);
                var x0 = Math.Max(0, px - fx);
                var x1 = Math.Min(w, px + fx);
                var y0 = Math.Max(0, py - fy);
                var y1 = Math.Min(h, py + fy);
                var area = (x1 - x0) * (y1 - y0);
                if (!(covX > 0 && covY > 0 && area > 0)) { output[i] = 1; continue; }
                var k = covX * covY / (area * 16);
                var a = BoxSum(alpha, stride, w, h, x0, y0, x1, y1) * k * (1d / 255);
                opacity[i] = (float)a;
                output[i] = (float)Math.Clamp((BoxSum(luma, stride, w, h, x0, y0, x1, y1) * k + 255 * (1 - a)) * (1d / 255), 0, 1);
            }
        }
        if (opacity.All(value => value >= .998)) Array.Fill(opacity, 1);
        return new Samples(output, opacity, width, height);
    }

    private static double BoxSum(double[] table, int stride, int width, int height, double x0, double y0, double x1, double y1) =>
        At(table, stride, width, height, x1, y1) - At(table, stride, width, height, x0, y1)
        - At(table, stride, width, height, x1, y0) + At(table, stride, width, height, x0, y0);

    private static double At(double[] table, int stride, int width, int height, double x, double y)
    {
        var i = Math.Min((int)x, width - 1);
        var j = Math.Min((int)y, height - 1);
        var fx = x - i;
        var fy = y - j;
        var p = j * stride + i;
        var top = table[p] + (table[p + 1] - table[p]) * fx;
        var bottom = table[p + stride] + (table[p + stride + 1] - table[p + stride]) * fx;
        return top + (bottom - top) * fy;
    }

    private static RgbaGrid Downscale(RgbaGrid source, CancellationToken token)
    {
        var w = source.WidthInPixels;
        var h = source.HeightInPixels;
        var scale = 1024d / Math.Max(w, h);
        if (scale >= 1) return source;
        var tw = Math.Max(1, (int)Math.Floor(w * scale + .5));
        var th = Math.Max(1, (int)Math.Floor(h * scale + .5));
        var output = new byte[tw * th * 4];
        var spans = new (int Index, double Weight)[tw][];
        for (var x = 0; x < tw; x++)
        {
            var a = x * ((double)w / tw);
            var b = Math.Min(w, (x + 1) * ((double)w / tw));
            var entries = new List<(int, double)>();
            for (var i = (int)Math.Floor(a); i < b && i < w; i++)
            {
                var weight = Math.Min(b, i + 1) - Math.Max(a, i);
                if (weight > 1e-12) entries.Add((i, weight));
            }
            spans[x] = entries.ToArray();
        }
        var sy = (double)h / th;
        var inverse = 1 / (((double)w / tw) * sy);
        var row = new double[tw * 4];
        var accumulated = new double[row.Length];
        void Flush(int oy)
        {
            for (var x = 0; x < tw; x++)
            {
                var p = x * 4;
                var q = (oy * tw + x) * 4;
                var a = accumulated[p + 3];
                if (a > 0) for (var channel = 0; channel < 3; channel++) output[q + channel] = (byte)Math.Clamp(Math.Round(accumulated[p + channel] / a), 0, 255);
                output[q + 3] = (byte)Math.Clamp(Math.Round(a * inverse), 0, 255);
            }
            Array.Clear(accumulated);
        }
        var outputY = 0;
        var end = sy;
        for (var y = 0; y < h && outputY < th; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < tw; x++)
            {
                var r = 0d; var g = 0d; var b = 0d; var a = 0d;
                foreach (var (index, weight) in spans[x])
                {
                    var p = (y * w + index) * 4;
                    var wa = weight * source.Pixels[p + 3];
                    r += source.Pixels[p] * wa; g += source.Pixels[p + 1] * wa; b += source.Pixels[p + 2] * wa; a += wa;
                }
                row[x * 4] = r; row[x * 4 + 1] = g; row[x * 4 + 2] = b; row[x * 4 + 3] = a;
            }
            var last = y == h - 1;
            var weightIn = last ? 1 : Math.Min(y + 1, end) - y;
            for (var k = 0; k < row.Length; k++) accumulated[k] += row[k] * weightIn;
            if (last || y + 1 >= end - 1e-9)
            {
                Flush(outputY++);
                end = (outputY + 1) * sy;
                var spill = y + 1 - (end - sy);
                if (!last && spill > 1e-9 && outputY < th)
                    for (var k = 0; k < row.Length; k++) accumulated[k] += row[k] * spill;
            }
        }
        while (outputY < th) Flush(outputY++);
        return new RgbaGrid(tw, th, output);
    }
}

using Ascii4Fun.Images;
using Ascii4Fun.Media;

namespace Ascii4Fun.Compact;

internal static class CompactArtPipeline
{
    internal static AsciiCanvas ConvertSource(RgbaGrid source, CompactArtOptions options, CancellationToken token = default)
    {
        token.ThrowIfCancellationRequested();
        options.Validate();
        ImageGridGeometry.ValidateDimensions((uint)source.WidthInPixels, (uint)source.HeightInPixels, ConversionLimits.Default);
        if ((long)source.WidthInPixels * source.HeightInPixels * 4 != source.Pixels.Length)
            throw new ArgumentException("Invalid compact source RGBA buffer.", nameof(source));
        var layout = CompactArtGeometry.Plan(source.WidthInPixels, source.HeightInPixels, options);
        var samples = CompactSourceSampler.Sample(source, layout, options, token);
        var tone = CompactToneMapper.Prepare(samples.Lightness, samples.Alpha, samples.Width, samples.Height, options, token);
        return Map(tone, samples.Width, samples.Height, options, token);
    }

    internal static AsciiCanvas Convert(RgbaGrid samples, CompactArtOptions options, CancellationToken token = default)
    {
        var tone = CompactToneMapper.Prepare(samples, options, token);
        return Map(tone, samples.WidthInPixels, samples.HeightInPixels, options, token);
    }

    private static AsciiCanvas Map(CompactToneMapper.PreparedTone tone, int width, int height, CompactArtOptions options, CancellationToken token)
    {
        var glyphs = CompactDotEncoder.Encode(tone.Lightness, width, height,
            options.Dither, tone.Edge, options.Edges, tone.TransparentSamples, token);
        var foreground = options.Invert ? new RgbColor(255, 255, 255) : new RgbColor(0, 0, 0);
        var background = options.Invert ? new RgbColor(0, 0, 0) : new RgbColor(255, 255, 255);
        var cells = new AsciiCell[glyphs.Length];
        for (var index = 0; index < cells.Length; index++) cells[index] = new AsciiCell(glyphs[index], foreground);
        return new AsciiCanvas(cells, width / 2, height / 4, background);
    }
}

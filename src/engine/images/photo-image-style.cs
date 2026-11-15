using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal static class PhotoImageStyle
{
    public static AsciiCanvas Apply(AsciiCanvas canvas, RgbaGrid samples, LuminanceRange range,
        CharacterImageOptions options, PhotoGlyphMap glyphs, CancellationToken token)
    {
        var size = PhotoSampleGeometry.Size(canvas.WidthInCells, canvas.HeightInCells);
        if (samples.WidthInPixels != size.Width || samples.HeightInPixels != size.Height || samples.Pixels.LongLength != (long)size.Width * size.Height * 4)
            throw new ArgumentException("Photo samples must match the requested 4 by 8 cell geometry.", nameof(samples));
        var normalized = AutoToneMapper.Normalize(LuminanceAnalyzer.Analyze(samples, token), token, range);
        for (var i = 0; i < normalized.Values.Length; i++) normalized.Values[i] = Math.Clamp(normalized.Values[i], 0, 1);
        var enhanced = PhotoToneMapper.Enhance(normalized, token);
        var tone = new ToneAdjustment(options.Contrast, options.Brightness, options.ShadowLift);
        var cells = canvas.Cells.ToArray();
        var sampleWidth = PhotoSampleGeometry.WidthPerCell;
        var sampleHeight = PhotoSampleGeometry.HeightPerCell;
        var cellSamples = new double[sampleWidth * sampleHeight];
        for (var y = 0; y < canvas.HeightInCells; y++)
        {
            token.ThrowIfCancellationRequested();
            for (var x = 0; x < canvas.WidthInCells; x++)
            {
                double ink = 0;
                for (var sy = 0; sy < sampleHeight; sy++)
                    for (var sx = 0; sx < sampleWidth; sx++)
                    {
                        var value = tone.Apply(enhanced[(y * sampleHeight + sy) * size.Width + x * sampleWidth + sx]);
                        if (!options.Invert) value = 1 - value;
                        cellSamples[sy * sampleWidth + sx] = value;
                        ink += value / cellSamples.Length;
                    }
                var index = y * canvas.WidthInCells + x;
                cells[index] = cells[index] with { Glyph = glyphs.Select(PhotoGlyphMap.Measure(cellSamples, sampleWidth, sampleHeight), ink) };
            }
        }
        return new AsciiCanvas(cells, canvas.WidthInCells, canvas.HeightInCells, canvas.BackgroundColor,
            canvas.SourcePhotoRgba, canvas.SourcePhotoOpacity);
    }
}

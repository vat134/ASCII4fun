using System.Text;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Images;

internal static class CharacterImagePipeline
{
    public static AsciiCanvas Convert(RgbaGrid source, CharacterImageOptions options, byte[]? sourcePhotoRgba = null,
        LuminanceRange? sequenceRange = null, Func<Rune, byte[]>? renderGlyph = null,
        CancellationToken cancellationToken = default)
    {
        var ramp = options.ValidateAndGetRamp();
        var (width, height) = (source.WidthInPixels, source.HeightInPixels);
        if (width < 1 || height < 1 || source.Pixels.LongLength != (long)width * height * 4)
            throw new ArgumentException("The sampled image must contain RGBA pixels for every sample.", nameof(source));
        if (options.SourcePhotoOpacity > 0 && sourcePhotoRgba?.Length != SourcePhotoGeometry.ByteLength(width, height))
        {
            throw new ArgumentException("The source photo must match the full output raster.", nameof(sourcePhotoRgba));
        }
        var luminance = LuminanceAnalyzer.Analyze(source, cancellationToken);
        var normalized = AutoToneMapper.Normalize(luminance, cancellationToken, sequenceRange);
        var density = options.UseMeasuredGlyphDensity
            ? GlyphDensityMap.Create(ramp, renderGlyph ?? throw new ArgumentNullException(nameof(renderGlyph)), cancellationToken)
            : null;
        return CharacterImageMapper.Map(normalized, source, ramp, options,
            options.SourcePhotoOpacity > 0 ? sourcePhotoRgba : null, cancellationToken, density);
    }
}

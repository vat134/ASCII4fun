using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Images;

internal static class CharacterImagePipeline
{
    public static AsciiCanvas Convert(RgbaGrid source, CharacterImageOptions options, byte[]? sourcePhotoRgba = null,
        CancellationToken cancellationToken = default)
    {
        var ramp = options.ValidateAndGetRamp();
        var (width, height) = ImageSamplingGeometry.OutputSize(source.WidthInPixels, source.HeightInPixels, options.Style);
        if (source.Pixels.LongLength != (long)source.WidthInPixels * source.HeightInPixels * 4)
            throw new ArgumentException("The sampled image must contain RGBA pixels for every sample.", nameof(source));
        if (options.SourcePhotoOpacity > 0 && sourcePhotoRgba?.Length != SourcePhotoGeometry.ByteLength(width, height))
        {
            throw new ArgumentException("The source photo must match the full output raster.", nameof(sourcePhotoRgba));
        }
        var luminance = LuminanceAnalyzer.Analyze(source, cancellationToken);
        var normalized = AutoToneMapper.Normalize(luminance, cancellationToken);
        if (options.Style == ImageStyle.Braille)
            return BrailleImageMapper.Map(normalized, source, options,
                options.SourcePhotoOpacity > 0 ? sourcePhotoRgba : null, cancellationToken);
        return CharacterImageMapper.Map(normalized, source, ramp, options,
            options.SourcePhotoOpacity > 0 ? sourcePhotoRgba : null, cancellationToken);
    }
}

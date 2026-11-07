using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Images;

internal static class CharacterImagePipeline
{
    public static AsciiCanvas Convert(RgbaGrid source, CharacterImageOptions options, byte[]? sourcePhotoRgba = null,
        CancellationToken cancellationToken = default)
    {
        var ramp = options.ValidateAndGetRamp();
        if (options.SourcePhotoOpacity > 0 && sourcePhotoRgba?.Length != SourcePhotoGeometry.ByteLength(source.WidthInCells, source.HeightInCells))
        {
            throw new ArgumentException("The source photo must match the full output raster.", nameof(sourcePhotoRgba));
        }
        var luminance = LuminanceAnalyzer.Analyze(source, cancellationToken);
        var normalized = AutoToneMapper.Normalize(luminance, cancellationToken);
        return CharacterImageMapper.Map(normalized, source, ramp, options,
            options.SourcePhotoOpacity > 0 ? sourcePhotoRgba : null, cancellationToken);
    }
}

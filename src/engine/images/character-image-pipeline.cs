using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal static class CharacterImagePipeline
{
    public static AsciiCanvas Convert(RgbaGrid source, CharacterImageOptions options, CancellationToken cancellationToken = default)
    {
        var ramp = options.ValidateAndGetRamp();
        var luminance = LuminanceAnalyzer.Analyze(source, cancellationToken);
        var normalized = AutoToneMapper.Normalize(luminance, cancellationToken);
        return CharacterImageMapper.Map(normalized, source, ramp, options, cancellationToken);
    }
}

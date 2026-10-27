using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

/// <summary>
/// Converts encoded still images through the shared character-image pipeline.
/// </summary>
public sealed class StillImageConverter
{
    private readonly ConversionLimits limits;

    /// <summary>
    /// Gets the encoded input limit, in bytes, enforced by this converter.
    /// </summary>
    public long MaxEncodedBytes => limits.MaxEncodedBytes;

    /// <summary>
    /// Initializes a converter with the current safe local defaults.
    /// </summary>
    public StillImageConverter()
        : this(ConversionLimits.Default)
    {
    }

    internal StillImageConverter(ConversionLimits limits)
    {
        this.limits = limits;
    }

    /// <summary>
    /// Converts a JPEG, PNG, or still WebP stream to a glyph-and-color canvas.
    /// </summary>
    /// <param name="encodedImage">A readable stream containing encoded image bytes.</param>
    /// <param name="options">Character conversion options, or <see langword="null" /> for defaults.</param>
    /// <param name="cancellationToken">Stops input reading and cancellable decode work.</param>
    /// <returns>The rectangular canvas shared by text and image exporters.</returns>
    public async Task<AsciiCanvas> ConvertAsync(
        Stream encodedImage,
        CharacterImageOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(encodedImage);

        if (!encodedImage.CanRead)
        {
            throw new ArgumentException("The encoded image stream must be readable.", nameof(encodedImage));
        }

        options ??= new CharacterImageOptions();
        var ramp = options.ValidateAndGetRamp();
        var rgbaGrid = await MagickStillImageReader.ReadGridAsync(
            encodedImage,
            options.OutputWidthInCells,
            CharacterImageOptions.CharacterCellAspectRatio,
            limits,
            cancellationToken);
        var luminanceGrid = LuminanceAnalyzer.Analyze(rgbaGrid, cancellationToken);
        var normalizedGrid = AutoToneMapper.Normalize(luminanceGrid, cancellationToken);

        return CharacterImageMapper.Map(normalizedGrid, rgbaGrid, ramp, options, cancellationToken);
    }
}

using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Images;

/// <summary> Converts encoded still images through the shared character-image pipeline. </summary>
public sealed class StillImageConverter
{
    private readonly ConversionLimits limits;

    /// <summary> The encoded input limit, in bytes, enforced by this converter. </summary>
    public long MaxEncodedBytes => limits.MaxEncodedBytes;

    /// <summary> Creates a converter with bounded local-use defaults. </summary>
    public StillImageConverter()
        : this(ConversionLimits.Default)
    {
    }

    internal StillImageConverter(ConversionLimits limits)
    {
        this.limits = limits;
    }

    /// <summary> Converts a JPEG, PNG, or still WebP stream to a glyph-and-color canvas. </summary>
    /// <param name="encodedImage">A readable stream containing encoded image bytes.</param>
    /// <param name="options">Character conversion options, or <see langword="null" /> for defaults.</param>
    /// <param name="cancellationToken">Cancels input reading and checked stages of decoding, analysis, and mapping.</param>
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
        options.ValidateAndGetRamp();
        var prepared = await MagickStillImageReader.ReadAsync(
            encodedImage,
            options.OutputWidthInCells,
            CharacterCellGeometry.AspectRatio,
            limits,
            includeSourcePhoto: options.SourcePhotoOpacity > 0,
            cancellationToken);
        return CharacterImagePipeline.Convert(prepared.Grid, options, prepared.SourcePhotoRgba, cancellationToken);
    }
}

using Ascii4Fun.Images;
using Ascii4Fun.Media;

namespace Ascii4Fun.Compact;

/// <summary>A rectangular Braille canvas and the exact text prepared for its destination.</summary>
public sealed record CompactArtResult(AsciiCanvas Canvas, CompactArtPayload Payload);

/// <summary>Converts bounded still photos into destination-aware compact Braille through the shared engine.</summary>
public sealed class CompactArtConverter
{
    private readonly ConversionLimits limits = ConversionLimits.Default;
    /// <summary>Maximum encoded source size, shared with still-image conversion.</summary>
    public long MaxEncodedBytes => limits.MaxEncodedBytes;

    /// <summary>Converts JPEG, PNG or still WebP. No source media is retained.</summary>
    /// <param name="encodedImage">Readable encoded still-image stream.</param>
    /// <param name="options">Compact preparation and destination settings; omitted settings use Steam comments.</param>
    /// <param name="cancellationToken">Cancels reads and checked decode, tone, dither and mapping stages.</param>
    /// <returns>The clean-cell artwork and separately formatted destination payload.</returns>
    public async Task<CompactArtResult> ConvertAsync(Stream encodedImage, CompactArtOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(encodedImage);
        if (!encodedImage.CanRead) throw new ArgumentException("The encoded image must be readable.", nameof(encodedImage));
        options ??= new CompactArtOptions();
        options.Validate();
        var prepared = await MagickStillImageReader.ReadAsync(encodedImage, 4, .5, limits,
            false, false, cancellationToken, options);
        var canvas = CompactArtPipeline.ConvertSource(prepared.Grid, options, cancellationToken);
        return new CompactArtResult(canvas, CompactDestinations.Format(canvas.Text, canvas.WidthInCells, canvas.HeightInCells, options.Destination));
    }
}

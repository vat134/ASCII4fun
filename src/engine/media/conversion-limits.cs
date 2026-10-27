namespace Ascii4Fun.Media;

internal sealed record ConversionLimits(
    long MaxEncodedBytes,
    long MaxDecodedPixels,
    int MaxInputDimension,
    int MaxGridCells)
{
    private const long BytesPerMebibyte = 1024 * 1024;
    private const long DefaultMaxEncodedBytes = 25 * BytesPerMebibyte;
    private const long DefaultMaxDecodedPixels = 40_000_000;
    private const int DefaultMaxInputDimension = 16_384;
    private const int DefaultMaxGridCells = 250_000;

    // shortcut: these limits are provisional until Task 5 establishes release-build measurements.
    public static ConversionLimits Default { get; } = new(
        MaxEncodedBytes: DefaultMaxEncodedBytes,
        MaxDecodedPixels: DefaultMaxDecodedPixels,
        MaxInputDimension: DefaultMaxInputDimension,
        MaxGridCells: DefaultMaxGridCells);
}

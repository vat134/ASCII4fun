namespace Ascii4Fun.Animations;

internal static class AnimationLimits
{
    // Initial single-user admission, measured with the GIF spike; not total-process RAM guarantees.
    public const int MaxSourceFrames = 300;
    public const long MaxDecodedPixels = 40_000_000;
    public const long MaxExportPixels = 128_000_000;
    public const long MaxEncodedExportBytes = 64 * 1024 * 1024;

    public static void ValidateSource(int width, int height, int frameCount)
    {
        if (width < 1 || height < 1 || width > 16_384 || height > 16_384 || frameCount is < 1 or > MaxSourceFrames
            || (long)width * height * frameCount > MaxDecodedPixels)
            throw new InvalidDataException("GIF exceeds the 300-frame or 40-million decoded-pixel limit.");
    }
}

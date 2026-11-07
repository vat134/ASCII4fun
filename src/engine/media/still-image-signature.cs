namespace Ascii4Fun.Media;

internal static class StillImageSignature
{
    private const int RiffHeaderLength = 12;
    private const int ContainerTagLength = 4;
    private const int WebPFormatTagOffset = 8;

    private static ReadOnlySpan<byte> JpegSignature => [0xFF, 0xD8, 0xFF];

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    public static void Validate(ReadOnlySpan<byte> encodedBytes)
    {
        var isJpeg = encodedBytes.StartsWith(JpegSignature);
        var isPng = encodedBytes.StartsWith(PngSignature);
        var isWebP = encodedBytes.Length >= RiffHeaderLength
            && encodedBytes[..ContainerTagLength].SequenceEqual("RIFF"u8)
            && encodedBytes.Slice(WebPFormatTagOffset, ContainerTagLength).SequenceEqual("WEBP"u8);

        if (!isJpeg && !isPng && !isWebP)
        {
            throw new InvalidDataException(
                "The input signature is not supported. Use JPEG, PNG, or WebP.");
        }
    }

}

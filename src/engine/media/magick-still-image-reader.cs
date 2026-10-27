using System.Buffers;
using ImageMagick;

namespace Ascii4Fun.Media;

internal static class MagickStillImageReader
{
    private const int StillImageFrameProbeLimit = 2;
    private const int ReadBufferSizeInBytes = 81_920;
    private const int RiffHeaderLength = 12;
    private const int ContainerTagLength = 4;
    private const int WebPFormatTagOffset = 8;

    private static ReadOnlySpan<byte> JpegSignature => [0xFF, 0xD8, 0xFF];

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    public static async Task<RgbaGrid> ReadGridAsync(
        Stream encodedImage,
        int outputWidthInCells,
        double characterCellAspectRatio,
        ConversionLimits limits,
        CancellationToken cancellationToken)
    {
        var encodedBytes = await ReadEncodedBytesAsync(encodedImage, limits.MaxEncodedBytes, cancellationToken);

        ValidateSupportedSignature(encodedBytes);
        await ValidateMetadataAsync(encodedBytes, limits, cancellationToken);

        try
        {
            using var image = new MagickImage();
            using var stream = new MemoryStream(encodedBytes, writable: false);
            await image.ReadAsync(stream, cancellationToken);

            image.AutoOrient();
            ValidateDimensions(image.Width, image.Height, limits);
            NormalizeColorSpace(image);

            var outputHeightInCells = CalculateOutputHeight(
                image.Width,
                image.Height,
                outputWidthInCells,
                characterCellAspectRatio,
                limits.MaxGridCells);

            var geometry = new MagickGeometry((uint)outputWidthInCells, (uint)outputHeightInCells)
            {
                IgnoreAspectRatio = true
            };

            image.Resize(geometry, FilterType.Box);
            cancellationToken.ThrowIfCancellationRequested();

            using var pixels = image.GetPixels();
            var rgba = pixels.ToByteArray(PixelMapping.RGBA)
                ?? throw new InvalidDataException("The decoded image did not expose RGBA pixels.");

            return new RgbaGrid(outputWidthInCells, outputHeightInCells, rgba);
        }
        catch (MagickException exception)
        {
            throw new InvalidDataException("The image could not be decoded.", exception);
        }
    }

    private static async Task ValidateMetadataAsync(
        byte[] encodedBytes,
        ConversionLimits limits,
        CancellationToken cancellationToken)
    {
        try
        {
            using var images = new MagickImageCollection();
            using var stream = new MemoryStream(encodedBytes, writable: false);
            var settings = new MagickReadSettings { FrameCount = StillImageFrameProbeLimit };
            await images.PingAsync(stream, settings, cancellationToken);

            if (images.Count == 0)
            {
                throw new InvalidDataException("The input does not contain an image.");
            }

            var image = images[0];

            if (!IsSupportedFormat(image.Format))
            {
                throw new InvalidDataException(
                    $"The detected {image.Format} format is not supported. Use JPEG, PNG, or still WebP.");
            }

            if (images.Count != 1)
            {
                throw new InvalidDataException(
                    "Animated or multi-frame images are not supported by still-image conversion.");
            }

            ValidateDimensions(image.Width, image.Height, limits);
        }
        catch (MagickException exception)
        {
            throw new InvalidDataException("The input is not a readable JPEG, PNG, or WebP image.", exception);
        }
    }

    private static bool IsSupportedFormat(MagickFormat format) =>
        format is MagickFormat.Jpeg
            or MagickFormat.Jpg
            or MagickFormat.Png
            or MagickFormat.Png00
            or MagickFormat.Png8
            or MagickFormat.Png24
            or MagickFormat.Png32
            or MagickFormat.Png48
            or MagickFormat.Png64
            or MagickFormat.WebP;

    private static void ValidateSupportedSignature(ReadOnlySpan<byte> encodedBytes)
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

    private static void NormalizeColorSpace(MagickImage image)
    {
        if (image.TransformColorSpace(ColorProfiles.SRGB))
        {
            return;
        }

        if (image.ColorSpace == ColorSpace.CMYK)
        {
            image.TransformColorSpace(ColorProfiles.USWebCoatedSWOP, ColorProfiles.SRGB);
            return;
        }

        image.ColorSpace = ColorSpace.sRGB;
    }

    private static void ValidateDimensions(uint width, uint height, ConversionLimits limits)
    {
        if (width == 0 || height == 0)
        {
            throw new InvalidDataException("The image dimensions must be greater than zero.");
        }

        if (width > limits.MaxInputDimension || height > limits.MaxInputDimension)
        {
            throw new InvalidDataException(
                $"The image dimensions exceed the current {limits.MaxInputDimension}-pixel side limit.");
        }

        var decodedPixels = checked((long)width * height);

        if (decodedPixels > limits.MaxDecodedPixels)
        {
            throw new InvalidDataException(
                $"The image exceeds the current {limits.MaxDecodedPixels:N0}-pixel decode limit.");
        }
    }

    private static int CalculateOutputHeight(
        uint inputWidth,
        uint inputHeight,
        int outputWidthInCells,
        double characterCellAspectRatio,
        int maxGridCells)
    {
        var aspectCorrectHeight =
            (inputHeight / (double)inputWidth) * outputWidthInCells * characterCellAspectRatio;
        var outputHeightInCells = Math.Max(
            1,
            (int)Math.Round(aspectCorrectHeight, MidpointRounding.AwayFromZero));

        if ((long)outputWidthInCells * outputHeightInCells > maxGridCells)
        {
            throw new InvalidDataException(
                $"The requested output exceeds the current {maxGridCells:N0}-cell grid limit.");
        }

        return outputHeightInCells;
    }

    private static async Task<byte[]> ReadEncodedBytesAsync(
        Stream source,
        long maxEncodedBytes,
        CancellationToken cancellationToken)
    {
        var buffer = ArrayPool<byte>.Shared.Rent(ReadBufferSizeInBytes);

        try
        {
            using var destination = new MemoryStream();

            while (true)
            {
                var bytesRead = await source.ReadAsync(buffer.AsMemory(), cancellationToken);

                if (bytesRead == 0)
                {
                    break;
                }

                if (destination.Length + bytesRead > maxEncodedBytes)
                {
                    throw new InvalidDataException(
                        $"The encoded image exceeds the current {maxEncodedBytes:N0}-byte input limit.");
                }

                destination.Write(buffer, 0, bytesRead);
            }

            if (destination.Length == 0)
            {
                throw new InvalidDataException("The encoded image is empty.");
            }

            return destination.ToArray();
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer, clearArray: true);
        }
    }
}

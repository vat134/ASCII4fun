using System.Buffers;
using ImageMagick;

namespace Ascii4Fun.Media;

internal static class MagickStillImageReader
{
    private const int StillImageFrameProbeLimit = 2;
    private const int ReadBufferSizeInBytes = 81_920;
    public static async Task<RgbaGrid> ReadGridAsync(
        Stream encodedImage,
        int outputWidthInCells,
        double characterCellAspectRatio,
        ConversionLimits limits,
        CancellationToken cancellationToken)
    {
        var encodedBytes = await ReadEncodedBytesAsync(encodedImage, limits.MaxEncodedBytes, cancellationToken);

        StillImageSignature.Validate(encodedBytes);
        await ValidateMetadataAsync(encodedBytes, limits, cancellationToken);

        try
        {
            using var image = new MagickImage();
            using var stream = new MemoryStream(encodedBytes, writable: false);
            await image.ReadAsync(stream, cancellationToken);

            image.AutoOrient();
            ImageGridGeometry.ValidateDimensions(image.Width, image.Height, limits);
            NormalizeColorSpace(image);

            var outputHeightInCells = ImageGridGeometry.CalculateOutputHeight(
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

            ImageGridGeometry.ValidateDimensions(image.Width, image.Height, limits);
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

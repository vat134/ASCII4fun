using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Media;

internal static class MagickStillImageReader
{
    private const int StillImageFrameProbeLimit = 2;
    public static async Task<PreparedStillImage> ReadAsync(
        Stream encodedImage,
        int outputWidthInCells,
        double characterCellAspectRatio,
        ConversionLimits limits,
        bool includeSourcePhoto,
        CancellationToken cancellationToken)
    {
        var encodedBytes = await EncodedMediaReader.ReadAsync(encodedImage, limits.MaxEncodedBytes, cancellationToken);

        StillImageSignature.Validate(encodedBytes);
        await ValidateMetadataAsync(encodedBytes, limits, cancellationToken);

        try
        {
            using var image = new MagickImage();
            using var stream = new MemoryStream(encodedBytes, writable: false);
            await image.ReadAsync(stream, cancellationToken);

            image.AutoOrient();
            ImageGridGeometry.ValidateDimensions(image.Width, image.Height, limits);
            MagickColorNormalizer.Apply(image);

            var outputHeightInCells = ImageGridGeometry.CalculateOutputHeight(
                image.Width,
                image.Height,
                outputWidthInCells,
                characterCellAspectRatio,
                limits.MaxGridCells);

            var sampleWidthInPixels = outputWidthInCells;
            var sampleHeightInPixels = outputHeightInCells;
            var geometry = new MagickGeometry((uint)sampleWidthInPixels, (uint)sampleHeightInPixels)
            {
                IgnoreAspectRatio = true
            };

            if (includeSourcePhoto)
            {
                SourcePhotoGeometry.ByteLength(outputWidthInCells, outputHeightInCells);
            }

            using var sampled = includeSourcePhoto ? image.Clone() : null;
            var gridImage = sampled ?? image;
            gridImage.Resize(geometry, FilterType.Box);
            cancellationToken.ThrowIfCancellationRequested();

            using var pixels = gridImage.GetPixels();
            var rgba = pixels.ToByteArray(PixelMapping.RGBA)
                ?? throw new InvalidDataException("The decoded image did not expose RGBA pixels.");

            byte[]? sourcePhotoRgba = null;
            if (includeSourcePhoto)
            {
                cancellationToken.ThrowIfCancellationRequested();
                geometry.Width = (uint)(outputWidthInCells * CharacterCellGeometry.WidthInPixels);
                geometry.Height = (uint)(outputHeightInCells * CharacterCellGeometry.HeightInPixels);
                if (cancellationToken.CanBeCanceled)
                {
                    image.Progress += (_, progress) => progress.Cancel = cancellationToken.IsCancellationRequested;
                }
                image.Resize(geometry, FilterType.Box);
                cancellationToken.ThrowIfCancellationRequested();
                using var photoPixels = image.GetPixels();
                sourcePhotoRgba = photoPixels.ToByteArray(PixelMapping.RGBA)
                    ?? throw new InvalidDataException("The decoded photo did not expose RGBA pixels.");
            }

            return new PreparedStillImage(new RgbaGrid(sampleWidthInPixels, sampleHeightInPixels, rgba), sourcePhotoRgba);
        }
        catch (MagickException exception)
        {
            cancellationToken.ThrowIfCancellationRequested();
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



}

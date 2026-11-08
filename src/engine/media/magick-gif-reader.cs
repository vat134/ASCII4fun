using Ascii4Fun.Animations;
using ImageMagick;

namespace Ascii4Fun.Media;

internal static class MagickGifReader
{
    public static async Task<MagickImageCollection> ReadAsync(Stream input, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(input);
        var bytes = await EncodedMediaReader.ReadAsync(input, ConversionLimits.Default.MaxEncodedBytes, cancellationToken);
        if (bytes.Length < 13 || (!bytes.AsSpan(0, 6).SequenceEqual("GIF89a"u8) && !bytes.AsSpan(0, 6).SequenceEqual("GIF87a"u8)))
            throw new InvalidDataException("Choose a readable GIF file.");
        try
        {
            using (var metadata = new MagickImageCollection())
            {
                using var probe = new MemoryStream(bytes, writable: false);
                await metadata.PingAsync(probe, new MagickReadSettings { FrameCount = AnimationLimits.MaxSourceFrames + 1 }, cancellationToken);
                if (metadata.Count == 0) throw new InvalidDataException("GIF contains no frames.");
                var width = metadata[0].Page.Width;
                var height = metadata[0].Page.Height;
                AnimationLimits.ValidateSource(checked((int)width), checked((int)height), metadata.Count);
                foreach (var frame in metadata)
                    if (frame.Width > width || frame.Height > height || frame.Page.X < 0 || frame.Page.Y < 0
                        || frame.Page.X + frame.Width > width || frame.Page.Y + frame.Height > height)
                        throw new InvalidDataException("GIF frame falls outside its logical canvas.");
            }
            var frames = new MagickImageCollection();
            try
            {
                using var encoded = new MemoryStream(bytes, writable: false);
                await frames.ReadAsync(encoded, cancellationToken);
                // Coalesce replaces native frames. Progress delegates attached before replacement
                // can outlive their managed wrappers; register callbacks only on owned resize/output images.
                frames.Coalesce();
                foreach (var frame in frames) MagickColorNormalizer.Apply(frame);
                cancellationToken.ThrowIfCancellationRequested();
                return frames;
            }
            catch
            {
                frames.Dispose();
                throw;
            }
        }
        catch (MagickException exception)
        {
            cancellationToken.ThrowIfCancellationRequested();
            throw new InvalidDataException("GIF could not be decoded.", exception);
        }
    }
}

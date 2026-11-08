using System.Buffers;

namespace Ascii4Fun.Media;

internal static class EncodedMediaReader
{
    private const int ReadBufferSizeInBytes = 81_920;
    public static async Task<byte[]> ReadAsync(
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

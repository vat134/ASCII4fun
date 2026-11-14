using System.Text.Json;
using System.Threading.Channels;
using Ascii4Fun.Animations;

namespace Ascii4Fun.Server.Animations;

internal static class AnimationExportStream
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public static Task WriteAsync(Stream output, IFormFile file, AnimationConversionRequest request, CancellationToken cancellationToken) =>
        WriteAsync(output, async (progress, token) =>
        {
            await using var input = file.OpenReadStream();
            using var source = await GifAnimation.OpenAsync(input, token);
            return await source.ExportAsync(request.Options, request.Playback, progress, token);
        }, "gif", cancellationToken);

    public static async Task WriteAsync(Stream output, Func<IProgress<int>, CancellationToken, Task<byte[]>> export,
        string format, CancellationToken cancellationToken)
    {
        using var lifetime = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var token = lifetime.Token;
        var updates = Channel.CreateBounded<int>(new BoundedChannelOptions(1)
        {
            SingleReader = true,
            SingleWriter = true,
            FullMode = BoundedChannelFullMode.DropOldest
        });
        var conversion = Task.Run(async () =>
        {
            try
            {
                return await export(new FrameProgress(updates.Writer), token);
            }
            finally { updates.Writer.TryComplete(); }
        }, token);
        try
        {
            await WriteLineAsync(new ExportProgress(0));
            await foreach (var count in updates.Reader.ReadAllAsync(token))
                await WriteLineAsync(new ExportProgress(count));
            var bytes = await conversion;
            if (format == "gif") await WriteLineAsync(new GifExportComplete(bytes));
            else if (format == "video") await WriteLineAsync(new VideoExportComplete(bytes));
            else throw new ArgumentException("Unsupported export format.", nameof(format));
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidDataException)
        {
            await WriteLineAsync(new ExportError(exception.Message));
        }
        finally
        {
            await lifetime.CancelAsync();
            // Observe and join the source-owning operation even after the client disconnects.
            try { await conversion; }
            catch (Exception exception) when (exception is OperationCanceledException or ArgumentException or InvalidDataException) { }
        }

        async Task WriteLineAsync<T>(T value)
        {
            await JsonSerializer.SerializeAsync(output, value, JsonOptions, token);
            await output.WriteAsync("\n"u8.ToArray(), token);
            await output.FlushAsync(token);
        }
    }

    private sealed class FrameProgress(ChannelWriter<int> writer) : IProgress<int>
    {
        public void Report(int value) => writer.TryWrite(value);
    }
}

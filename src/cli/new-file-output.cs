namespace Ascii4Fun.Cli;

internal static class NewFileOutput
{
    // The caller transfers a stream opened with CreateNew; existing files never enter this owner.
    public static async Task WriteAsync(FileStream destination, ReadOnlyMemory<byte> bytes,
        CancellationToken cancellationToken)
    {
        var path = destination.Name;
        var completed = false;
        try
        {
            await using (destination)
            {
                await destination.WriteAsync(bytes, cancellationToken);
            }
            completed = true;
        }
        finally
        {
            if (!completed) File.Delete(path);
        }
    }
}

using System.ComponentModel;
using System.Diagnostics;
using System.Text;

namespace Ascii4Fun.Videos;

internal sealed class FfmpegProcess : IAsyncDisposable
{
    private readonly Process process;
    private readonly Task<string> errors;
    private readonly CancellationTokenRegistration cancellation;

    public FfmpegProcess(string executable, IEnumerable<string> arguments, CancellationToken token)
    {
        var start = new ProcessStartInfo(executable)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        start.ArgumentList.Add("-max_alloc");
        start.ArgumentList.Add("268435456");
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        try { process = Process.Start(start) ?? throw new InvalidDataException("The video tool could not start."); }
        catch (Win32Exception exception) { throw new InvalidDataException("Video requires FFmpeg and ffprobe. Configure their executable paths or add them to PATH.", exception); }
        errors = ReadBoundedAsync(process.StandardError, 16384);
        cancellation = token.Register(KillIfRunning);
    }

    public Stream Input => process.StandardInput.BaseStream;
    public Stream Output => process.StandardOutput.BaseStream;

    public async Task CompleteAsync(CancellationToken token)
    {
        await process.WaitForExitAsync(token);
        var detail = await errors;
        token.ThrowIfCancellationRequested();
        if (process.ExitCode != 0)
            throw new InvalidDataException("The video codec could not process this file. Verify that the clip is complete and uses a supported codec.", new IOException(detail));
    }

    public static async Task<string> ReadBoundedAsync(StreamReader reader, int limit)
    {
        var result = new StringBuilder();
        var buffer = new char[4096];
        int count;
        while ((count = await reader.ReadAsync(buffer)) > 0)
            if (result.Length < limit) result.Append(buffer, 0, Math.Min(count, limit - result.Length));
        return result.ToString();
    }

    public async ValueTask DisposeAsync()
    {
        await cancellation.DisposeAsync();
        KillIfRunning();
        await process.WaitForExitAsync();
        await errors;
        process.Dispose();
    }

    private void KillIfRunning()
    {
        try { if (!process.HasExited) process.Kill(entireProcessTree: true); }
        catch (InvalidOperationException) { /* The owned process exited between the check and kill. */ }
    }
}

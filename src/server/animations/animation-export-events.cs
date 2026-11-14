namespace Ascii4Fun.Server.Animations;

internal sealed record ExportProgress(int CompletedFrames)
{
    public const string EventType = "progress";
    public string Type { get; } = EventType;
}

internal sealed record ExportError(string Message)
{
    public const string EventType = "error";
    public string Type { get; } = EventType;
}

internal sealed record GifExportComplete(byte[] Gif)
{
    public const string EventType = "complete";
    public string Type { get; } = EventType;
}

internal sealed record VideoExportComplete(byte[] Video)
{
    public const string EventType = "complete";
    public string Type { get; } = EventType;
}

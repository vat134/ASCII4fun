namespace Ascii4Fun.TestMedia;

internal static class VideoFixture
{
    public static byte[] Bytes(string extension = "mp4", string name = "video-sample")
    {
        using var stream = typeof(VideoFixture).Assembly.GetManifestResourceStream($"Fixtures.{name}.{extension}")
            ?? throw new InvalidOperationException("The authored video fixture is missing.");
        using var output = new MemoryStream();
        stream.CopyTo(output);
        return output.ToArray();
    }
}

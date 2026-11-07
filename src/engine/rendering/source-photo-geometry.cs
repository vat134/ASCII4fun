namespace Ascii4Fun.Rendering;

internal static class SourcePhotoGeometry
{
    // Allows portrait outputs at 180 columns while bounding the additional retained RGBA layer to 48 MB.
    private const int MaxPixels = 12_000_000;

    public static int ByteLength(int widthInCells, int heightInCells)
    {
        var pixels = (long)widthInCells * heightInCells * CharacterCellGeometry.WidthInPixels * CharacterCellGeometry.HeightInPixels;
        if (pixels < 1 || pixels > MaxPixels)
        {
            throw new InvalidDataException($"The source-photo background exceeds the {MaxPixels:N0}-pixel limit. Reduce columns or disable the photo.");
        }

        return checked((int)pixels * 4);
    }
}

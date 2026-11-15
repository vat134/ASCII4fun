namespace Ascii4Fun.Images;

internal static class PhotoSampleGeometry
{
    public const int WidthPerCell = 4;
    public const int HeightPerCell = 8;
    private const int MaximumSamplePixels = 2_000_000;

    public static (int Width, int Height) Size(int widthInCells, int heightInCells)
    {
        if (widthInCells < 1 || heightInCells < 1 || (long)widthInCells * heightInCells > MaximumSamplePixels / (WidthPerCell * HeightPerCell))
            throw new ArgumentOutOfRangeException(nameof(widthInCells), "Photo processing exceeds the sample budget. Choose fewer columns.");
        return (checked(widthInCells * WidthPerCell), checked(heightInCells * HeightPerCell));
    }
}

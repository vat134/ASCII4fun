namespace Ascii4Fun.Rendering;

/// <summary> Fixed character geometry shared by source sampling and raster export. </summary>
internal static class CharacterCellGeometry
{
    internal const int WidthInPixels = 12;
    internal const int HeightInPixels = 24;
    internal const double AspectRatio = (double)WidthInPixels / HeightInPixels;
}

using Ascii4Fun.Media;

namespace Ascii4Fun.Compact;

/// <summary>Fractional source crop and bounded destination grid, after orientation and quarter turns. Crop edges may extend beyond the source into transparent padding.</summary>
public sealed record CompactArtLayout(int Columns, int Rows, double CropXInPixels, double CropYInPixels,
    double CropWidthInPixels, double CropHeightInPixels)
{
    /// <summary>Source sample width: two dots per character.</summary>
    public int SampleWidthInPixels => Columns * 2;
    /// <summary>Source sample height: four dots per character.</summary>
    public int SampleHeightInPixels => Rows * 4;
}

/// <summary>Computes centered or repositioned crops and destination-aware compact grids.</summary>
public static class CompactArtGeometry
{
    /// <summary>Upper bound on output cells and eight-sample-per-cell work.</summary>
    public const int MaxCells = 40000;

    /// <summary>Maximum sample side, bounding neighborhood-filter work even for very tall grids.</summary>
    public const int MaxSampleDimensionInPixels = 2048;

    /// <summary>Plans a crop for an already oriented and rotated source. All options are validated before work.</summary>
    public static CompactArtLayout Plan(int sourceWidthInPixels, int sourceHeightInPixels, CompactArtOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.Validate();
        if (sourceWidthInPixels < 1 || sourceHeightInPixels < 1) throw new ArgumentOutOfRangeException(nameof(sourceWidthInPixels));
        ImageGridGeometry.ValidateDimensions((uint)sourceWidthInPixels, (uint)sourceHeightInPixels, ConversionLimits.Default);
        var (x, y, width, height) = Crop(sourceWidthInPixels, sourceHeightInPixels, options);
        var destination = CompactDestinations.Get(options.Destination);
        // Grid proportions follow the selected crop, not a resize that distorts it.
        var actualAspect = (double)width / height;
        var columns = options.Columns == 0 ? CompactDestinations.AutoColumns(destination, actualAspect) : options.Columns;
        var rows = CompactDestinations.Rows(columns, destination.CellAspectRatio, actualAspect);
        if ((long)columns * rows > MaxCells || columns * 2 > MaxSampleDimensionInPixels || rows * 4 > MaxSampleDimensionInPixels)
            throw new ArgumentOutOfRangeException(nameof(options), "Mini art exceeds the bounded sample grid. Crop the image or use fewer columns.");
        return new CompactArtLayout(columns, rows, x, y, width, height);
    }

    internal static (double X, double Y, double Width, double Height) Crop(int sourceWidth, int sourceHeight, CompactArtOptions options)
    {
        var aspect = options.CropAspectRatio == 0 ? (double)sourceWidth / sourceHeight : options.CropAspectRatio;
        var width = Math.Min(sourceWidth, sourceHeight * aspect) / options.CropZoom;
        var height = width / aspect;
        return (sourceWidth * options.CropX - width / 2, sourceHeight * options.CropY - height / 2, width, height);
    }
}

namespace Ascii4Fun.Server.Images;

internal sealed record ImageConfiguration(
    int DefaultOutputWidthInCells,
    int MinOutputWidthInCells,
    int MaxOutputWidthInCells,
    string DefaultCharacterRamp,
    double DefaultCharacterCellAspectRatio,
    long MaxEncodedBytes,
    int MinToneAdjustment,
    int MaxToneAdjustment,
    Ascii4Fun.Images.RgbColor DefaultMonochromeColor,
    Ascii4Fun.Images.RgbColor DefaultBackgroundColor,
    int MaxPercentage,
    string RequestToken);

internal sealed record ImageConversionResponse(string Text, int WidthInCells, int HeightInCells, byte[] Png);

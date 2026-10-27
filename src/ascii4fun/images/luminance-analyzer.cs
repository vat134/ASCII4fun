using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal static class LuminanceAnalyzer
{
    private const int RgbaChannelCount = 4;
    private const int GreenChannelOffset = 1;
    private const int BlueChannelOffset = 2;
    private const int AlphaChannelOffset = 3;
    private const double RedLuminanceWeight = 0.2126;
    private const double GreenLuminanceWeight = 0.7152;
    private const double BlueLuminanceWeight = 0.0722;
    private const double SrgbLinearThreshold = 0.04045;
    private const double SrgbLinearDivisor = 12.92;
    private const double SrgbCurveOffset = 0.055;
    private const double SrgbCurveScale = 1.055;
    private const double SrgbCurveExponent = 2.4;

    public static LuminanceGrid Analyze(RgbaGrid grid, CancellationToken cancellationToken)
    {
        var values = new double[grid.WidthInCells * grid.HeightInCells];

        for (var index = 0; index < values.Length; index++)
        {
            if (index % grid.WidthInCells == 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
            }

            var offset = index * RgbaChannelCount;
            values[index] = CalculateLuminance(
                grid.Pixels[offset],
                grid.Pixels[offset + GreenChannelOffset],
                grid.Pixels[offset + BlueChannelOffset],
                grid.Pixels[offset + AlphaChannelOffset]);
        }

        return new LuminanceGrid(grid.WidthInCells, grid.HeightInCells, values);
    }

    private static double CalculateLuminance(byte red, byte green, byte blue, byte alpha)
    {
        var opacity = alpha / (double)byte.MaxValue;
        var compositedRed = CompositeOverWhite(red, opacity);
        var compositedGreen = CompositeOverWhite(green, opacity);
        var compositedBlue = CompositeOverWhite(blue, opacity);

        var linearRed = LinearizeSrgb(compositedRed);
        var linearGreen = LinearizeSrgb(compositedGreen);
        var linearBlue = LinearizeSrgb(compositedBlue);

        return (RedLuminanceWeight * linearRed)
            + (GreenLuminanceWeight * linearGreen)
            + (BlueLuminanceWeight * linearBlue);
    }

    private static double CompositeOverWhite(byte channel, double opacity) =>
        ((channel * opacity) + (byte.MaxValue * (1 - opacity))) / byte.MaxValue;

    private static double LinearizeSrgb(double channel) =>
        channel <= SrgbLinearThreshold
            ? channel / SrgbLinearDivisor
            : Math.Pow((channel + SrgbCurveOffset) / SrgbCurveScale, SrgbCurveExponent);
}

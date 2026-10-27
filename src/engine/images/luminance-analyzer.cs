using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal static class LuminanceAnalyzer
{
    private const int RgbaChannelCount = 4;
    private const int GreenChannelOffset = 1;
    private const int BlueChannelOffset = 2;
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
                grid.ChannelOverWhite(offset),
                grid.ChannelOverWhite(offset + GreenChannelOffset),
                grid.ChannelOverWhite(offset + BlueChannelOffset));
        }

        return new LuminanceGrid(grid.WidthInCells, grid.HeightInCells, values);
    }

    private static double CalculateLuminance(double red, double green, double blue)
    {
        var linearRed = LinearizeSrgb(red);
        var linearGreen = LinearizeSrgb(green);
        var linearBlue = LinearizeSrgb(blue);

        return (RedLuminanceWeight * linearRed)
            + (GreenLuminanceWeight * linearGreen)
            + (BlueLuminanceWeight * linearBlue);
    }

    private static double LinearizeSrgb(double channel) =>
        channel <= SrgbLinearThreshold
            ? channel / SrgbLinearDivisor
            : Math.Pow((channel + SrgbCurveOffset) / SrgbCurveScale, SrgbCurveExponent);
}

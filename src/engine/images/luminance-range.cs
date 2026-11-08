using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal readonly record struct LuminanceRange(double Minimum, double Maximum)
{
    public static LuminanceRange Analyze(RgbaGrid grid, CancellationToken cancellationToken = default)
    {
        var values = LuminanceAnalyzer.Analyze(grid, cancellationToken).Values;
        return new LuminanceRange(values.Min(), values.Max());
    }
}

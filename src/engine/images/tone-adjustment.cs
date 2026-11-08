namespace Ascii4Fun.Images;

internal readonly struct ToneAdjustment(int contrast, int brightness, int shadowLift = 0)
{
    private const double PercentageScale = 100;
    private const double PositiveContrastDivisor = 25;
    private const double ShadowLiftDivisor = 50;
    private const double Midpoint = 0.5;

    private readonly double factor = contrast < 0 ? 1 + (contrast / PercentageScale) : 1 + (contrast / PositiveContrastDivisor);
    private readonly double offset = brightness / PercentageScale;
    private readonly double exponent = 1 / (1 + (shadowLift / ShadowLiftDivisor));

    // Neutral controls preserve exact values at glyph-selection thresholds.
    public double Apply(double value)
    {
        var lifted = exponent == 1 ? value : Math.Pow(value, exponent);
        return factor == 1 && offset == 0
            ? lifted
            : Math.Clamp(((lifted - Midpoint) * factor) + Midpoint + offset, 0, 1);
    }
}

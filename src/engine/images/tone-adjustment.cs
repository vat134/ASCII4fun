namespace Ascii4Fun.Images;

internal readonly struct ToneAdjustment(int contrast, int brightness, int shadowLift = 0)
{
    private readonly double factor = contrast < 0 ? 1 + (contrast / 100d) : 1 + (contrast / 25d);
    private readonly double offset = brightness / 100d;
    private readonly double exponent = 1 / (1 + (shadowLift / 50d));

    // Neutral controls preserve exact values at glyph-selection thresholds.
    public double Apply(double value)
    {
        var lifted = exponent == 1 ? value : Math.Pow(value, exponent);
        return factor == 1 && offset == 0
            ? lifted
            : Math.Clamp(((lifted - 0.5) * factor) + 0.5 + offset, 0, 1);
    }
}

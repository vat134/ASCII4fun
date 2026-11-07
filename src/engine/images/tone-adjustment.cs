namespace Ascii4Fun.Images;

internal readonly struct ToneAdjustment(int contrast, int brightness)
{
    private readonly double factor = contrast < 0 ? 1 + (contrast / 100d) : 1 + (contrast / 25d);
    private readonly double offset = brightness / 100d;

    // Neutral controls preserve exact values at glyph-selection thresholds.
    public double Apply(double value) => factor == 1 && offset == 0
        ? value
        : Math.Clamp(((value - 0.5) * factor) + 0.5 + offset, 0, 1);
}

namespace Ascii4Fun.Images;

internal static class AutoToneMapper
{
    private const double MinimumUsefulLuminanceRange = 1d / byte.MaxValue;

    public static LuminanceGrid Normalize(LuminanceGrid source, CancellationToken cancellationToken)
    {
        var minimum = double.MaxValue;
        var maximum = double.MinValue;

        for (var index = 0; index < source.Values.Length; index++)
        {
            if (index % source.WidthInCells == 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
            }

            minimum = Math.Min(minimum, source.Values[index]);
            maximum = Math.Max(maximum, source.Values[index]);
        }

        var range = maximum - minimum;

        if (range < MinimumUsefulLuminanceRange)
        {
            return source;
        }

        var normalized = new double[source.Values.Length];

        for (var index = 0; index < source.Values.Length; index++)
        {
            if (index % source.WidthInCells == 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
            }

            normalized[index] = (source.Values[index] - minimum) / range;
        }

        return new LuminanceGrid(source.WidthInCells, source.HeightInCells, normalized);
    }
}

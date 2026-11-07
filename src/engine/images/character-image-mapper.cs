using System.Text;
using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal static class CharacterImageMapper
{
    public static AsciiCanvas Map(
        LuminanceGrid grid,
        RgbaGrid source,
        Rune[] ramp,
        CharacterImageOptions options,
        byte[]? sourcePhotoRgba,
        CancellationToken cancellationToken)
    {
        var cells = new AsciiCell[grid.Values.Length];
        var tone = new ToneAdjustment(options.Contrast, options.Brightness, options.ShadowLift);

        for (var index = 0; index < cells.Length; index++)
        {
            if (index % grid.WidthInCells == 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
            }

            var luminance = tone.Apply(grid.Values[index]);
            if (options.Invert)
            {
                luminance = 1 - luminance;
            }

            var rampIndex = Math.Min((int)(luminance * ramp.Length), ramp.Length - 1);
            var color = options.MonochromeColor;
            if (options.SourceColors)
            {
                var sample = source.SampleOverWhite(index);
                color = new RgbColor(
                    (byte)Math.Round(tone.Apply(sample.Red) * byte.MaxValue),
                    (byte)Math.Round(tone.Apply(sample.Green) * byte.MaxValue),
                    (byte)Math.Round(tone.Apply(sample.Blue) * byte.MaxValue));
            }

            cells[index] = new AsciiCell(ramp[rampIndex], color);
        }

        return new AsciiCanvas(cells, grid.WidthInCells, grid.HeightInCells, options.BackgroundColor,
            sourcePhotoRgba, options.SourcePhotoOpacity);
    }
}

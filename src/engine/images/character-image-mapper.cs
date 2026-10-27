using System.Text;
using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal static class CharacterImageMapper
{
    internal static readonly RgbColor MonochromeColor = new(238, 238, 236);

    public static AsciiCanvas Map(
        LuminanceGrid grid,
        RgbaGrid source,
        Rune[] ramp,
        CharacterImageOptions options,
        CancellationToken cancellationToken)
    {
        var cells = new AsciiCell[grid.Values.Length];

        for (var index = 0; index < cells.Length; index++)
        {
            if (index % grid.WidthInCells == 0)
            {
                cancellationToken.ThrowIfCancellationRequested();
            }

            var luminance = options.Invert ? 1 - grid.Values[index] : grid.Values[index];
            var rampIndex = Math.Min((int)(luminance * ramp.Length), ramp.Length - 1);
            var color = MonochromeColor;
            if (options.SourceColors)
            {
                var offset = index * 4;
                color = new RgbColor(
                    (byte)Math.Round(source.ChannelOverWhite(offset) * byte.MaxValue),
                    (byte)Math.Round(source.ChannelOverWhite(offset + 1) * byte.MaxValue),
                    (byte)Math.Round(source.ChannelOverWhite(offset + 2) * byte.MaxValue));
            }

            cells[index] = new AsciiCell(ramp[rampIndex], color);
        }

        return new AsciiCanvas(cells, grid.WidthInCells, grid.HeightInCells);
    }
}

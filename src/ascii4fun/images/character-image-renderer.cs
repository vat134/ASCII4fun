using System.Text;

namespace Ascii4Fun.Images;

internal static class CharacterImageRenderer
{
    public static AsciiText Render(
        LuminanceGrid grid,
        Rune[] ramp,
        bool invert,
        CancellationToken cancellationToken)
    {
        var text = new StringBuilder((grid.WidthInCells + 1) * grid.HeightInCells);
        var glyphs = Array.ConvertAll(ramp, rune => rune.ToString());

        for (var y = 0; y < grid.HeightInCells; y++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            for (var x = 0; x < grid.WidthInCells; x++)
            {
                var luminance = grid.Values[(y * grid.WidthInCells) + x];

                if (invert)
                {
                    luminance = 1 - luminance;
                }

                var rampIndex = Math.Min((int)(luminance * ramp.Length), ramp.Length - 1);
                text.Append(glyphs[rampIndex]);
            }

            if (y + 1 < grid.HeightInCells)
            {
                text.Append('\n');
            }
        }

        return new AsciiText(text.ToString(), grid.WidthInCells, grid.HeightInCells);
    }
}

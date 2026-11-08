using System.Text;
using Ascii4Fun.Media;

namespace Ascii4Fun.Images;

internal static class BrailleImageMapper
{
    private const double DotThreshold = 0.5;
    // Dot numbers 1,4 / 2,5 / 3,6 / 7,8, traversed left-to-right and top-to-bottom.
    private static readonly int[] DotBits = [1, 8, 2, 16, 4, 32, 64, 128];

    public static AsciiCanvas Map(LuminanceGrid grid, RgbaGrid source, CharacterImageOptions options,
        byte[]? sourcePhotoRgba, CancellationToken cancellationToken)
    {
        var (columns, rows) = ImageSamplingGeometry.Scale(ImageStyle.Braille);
        var (width, height) = ImageSamplingGeometry.OutputSize(grid.WidthInPixels, grid.HeightInPixels, ImageStyle.Braille);
        var cells = new AsciiCell[width * height];
        var tone = new ToneAdjustment(options.Contrast, options.Brightness, options.ShadowLift);
        for (var y = 0; y < height; y++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            for (var x = 0; x < width; x++)
            {
                var mask = 0;
                var activeDots = 0;
                double red = 0, green = 0, blue = 0;
                for (var dot = 0; dot < DotBits.Length; dot++)
                {
                    var index = ((y * rows + dot / columns) * grid.WidthInPixels) + x * columns + dot % columns;
                    var light = tone.Apply(grid.Values[index]) >= DotThreshold;
                    if (light != options.Invert) continue;
                    mask |= DotBits[dot];
                    if (!options.SourceColors) continue;
                    // A cell has one ink color; empty source regions must not darken its lit dots.
                    var sample = source.SampleOverWhite(index);
                    red += tone.Apply(sample.Red);
                    green += tone.Apply(sample.Green);
                    blue += tone.Apply(sample.Blue);
                    activeDots++;
                }
                var color = options.SourceColors && activeDots > 0
                    ? new RgbColor((byte)Math.Round(red / activeDots * byte.MaxValue),
                        (byte)Math.Round(green / activeDots * byte.MaxValue), (byte)Math.Round(blue / activeDots * byte.MaxValue))
                    : options.MonochromeColor;
                cells[y * width + x] = new AsciiCell(new Rune(0x2800 + mask), color);
            }
        }
        return new AsciiCanvas(cells, width, height, options.BackgroundColor, sourcePhotoRgba, options.SourcePhotoOpacity);
    }
}

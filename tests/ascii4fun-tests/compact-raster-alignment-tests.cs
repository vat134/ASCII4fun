using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Tests;

public sealed class CompactRasterAlignmentTests
{
    [Fact]
    public void EveryBraillePatternRendersOnlyItsRaisedDots()
    {
        var dots = Enumerable.Range(0, 8).Select(bit => MagickGlyphRenderer.Render(new Rune(0x2800 + (1 << bit)))).ToArray();
        Assert.All(dots, dot => Assert.Contains(dot, value => value > 0));
        Assert.Equal(8, dots.Select(Convert.ToHexString).Distinct().Count());
        for (var pattern = 0; pattern < 256; pattern++)
        {
            var mask = MagickGlyphRenderer.Render(new Rune(0x2800 + pattern));
            for (var pixel = 0; pixel < mask.Length; pixel++)
            {
                var expected = Enumerable.Range(0, 8).Where(bit => (pattern & (1 << bit)) != 0)
                    .Select(bit => dots[bit][pixel]).DefaultIfEmpty((byte)0).Max();
                // Combined outlines can round antialias coverage by one byte.
                Assert.InRange(Math.Abs(expected - mask[pixel]), 0, 2);
            }
        }
    }

    [Fact]
    public void CleanBlanksNeverShiftLaterBrailleCellsOrRows()
    {
        var white = new RgbColor(255, 255, 255);
        var black = new RgbColor(0, 0, 0);
        var cells = "⠁⠀⠀⠁\n⠀⠁⠀⠁\n⠀⠀⠁⠁".Where(glyph => glyph != '\n')
            .Select(glyph => new AsciiCell(new Rune(glyph), white)).ToArray();
        var canvas = new AsciiCanvas(cells, 4, 3, black);
        var rgb = CanvasRasterizer.Render(canvas, MagickGlyphRenderer.Render);
        var mask = MagickGlyphRenderer.Render(new Rune('⠁'));
        Assert.Contains(mask, value => value > 0);
        for (var cell = 0; cell < cells.Length; cell++)
            for (var y = 0; y < 24; y++)
                for (var x = 0; x < 12; x++)
                {
                    var offset = ((cell / 4 * 24 + y) * 48 + cell % 4 * 12 + x) * 3;
                    var expected = cells[cell].Glyph.Value == 0x2800 ? (byte)0 : mask[y * 12 + x];
                    Assert.Equal(expected, rgb[offset]);
                }
    }
}

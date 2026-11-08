using Ascii4Fun.Figlet;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class FigletPaletteTests
{
    [Fact]
    public void PaletteDescribesWholeFontRatherThanCurrentText()
    {
        var palette = FigletConverter.GetFontPalette("tdf-colorrounded");
        Assert.Equal(15, palette.Count);
        Assert.Contains(new RgbColor(0, 0, 0), palette);
        var oneLetter = FigletConverter.Convert("I", "tdf-colorrounded");
        Assert.True(oneLetter.Cells.Select(cell => cell.Color).Distinct().Count() < palette.Count);
        Assert.Equal(palette, FigletConverter.GetFontPalette("tdf-colorrounded"));
        Assert.Equal(new[] { new RgbColor(170, 170, 170) }, FigletConverter.GetFontPalette("tdf-blunder-smal"));
    }

    [Fact]
    public void EveryBundledPaletteIsDistinctBoundedAndOrdered()
    {
        foreach (var font in FigletConverter.Fonts)
        {
            var palette = FigletConverter.GetFontPalette(font.Id);
            Assert.InRange(palette.Count, 1, 16);
            Assert.Equal(palette.Count, palette.Distinct().Count());
            Assert.Equal(palette.OrderBy(color => color.Red).ThenBy(color => color.Green).ThenBy(color => color.Blue), palette);
            Assert.DoesNotContain("Default variant", font.Note ?? "");
            Assert.DoesNotContain("Missing lowercase", font.Note ?? "");
        }
    }

    [Fact]
    public async Task ReplacementsPreserveOtherColorsGlyphsLayoutAndCanvasBackground()
    {
        var source = FigletConverter.Convert("ASCII Text", "tdf-colorrounded");
        var black = new RgbColor(0, 0, 0);
        var blue = new RgbColor(0, 0, 170);
        var red = new RgbColor(241, 30, 50);
        var replacements = new Dictionary<RgbColor, RgbColor> { [blue] = red, [black] = blue };
        var result = FigletConverter.Convert("ASCII Text", "tdf-colorrounded", colorReplacements: replacements);
        Assert.Equal(source.Text, result.Text);
        Assert.Equal(source.WidthInCells, result.WidthInCells);
        Assert.Equal(source.HeightInCells, result.HeightInCells);
        Assert.Equal(black, result.BackgroundColor);
        Assert.Contains(source.Cells, cell => cell.BackgroundColor == blue);
        Assert.Contains(source.Cells, cell => cell.Color == blue);
        for (var index = 0; index < source.Cells.Count; index++)
        {
            var original = source.Cells[index];
            Assert.Equal(replacements.GetValueOrDefault(original.Color, original.Color), result.Cells[index].Color);
            Assert.Equal(original.BackgroundColor is { } background ? replacements.GetValueOrDefault(background, background) : (RgbColor?)null,
                result.Cells[index].BackgroundColor);
        }
        using var png = new MagickImage(await PngExporter.ExportAsync(result));
        Assert.Equal(CanvasRasterizer.Render(result, MagickGlyphRenderer.Render), png.GetPixels().ToByteArray(PixelMapping.RGB));
        Assert.Equal(source.Cells, FigletConverter.Convert("ASCII Text", "tdf-colorrounded", colorReplacements: new Dictionary<RgbColor, RgbColor>()).Cells);
    }

    [Fact]
    public void InvalidPaletteRequestsFailExplicitly()
    {
        var replacements = new Dictionary<RgbColor, RgbColor> { [new(1, 2, 3)] = new(4, 5, 6) };
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert("A", "tdf-coder", colorReplacements: replacements));
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert("A", "tdf-coder", new(255, 255, 255), colorReplacements: replacements));
        Assert.Throws<ArgumentException>(() => FigletConverter.GetFontPalette("missing"));
        Assert.Throws<OperationCanceledException>(() => FigletConverter.GetFontPalette("tdf-coder", new CancellationToken(true)));
    }
}

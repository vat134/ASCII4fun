using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class ToneAndColorTests
{
    [Fact]
    public void BackgroundDoesNotChangeGlyphsOrFillEmptyCells()
    {
        var source = new RgbaGrid(3, 1, [0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]);
        var options = new CharacterImageOptions { CharacterRamp = "@:. " };
        var normal = CharacterImagePipeline.Convert(source, options);
        var colored = CharacterImagePipeline.Convert(source, new CharacterImageOptions
        {
            CharacterRamp = options.CharacterRamp,
            MonochromeColor = new RgbColor(0, 255, 255),
            BackgroundColor = new RgbColor(255, 0, 255)
        });
        Assert.Equal(normal.Text, colored.Text);
        Assert.Equal(' ', colored.Cells[^1].Glyph.Value);
        var pixels = CanvasRasterizer.Render(colored, _ =>
            Enumerable.Repeat((byte)255, CharacterCellGeometry.WidthInPixels * CharacterCellGeometry.HeightInPixels).ToArray());
        var finalCellOffset = 2 * CharacterCellGeometry.WidthInPixels * 3;
        Assert.Equal(new byte[] { 255, 0, 255 }, pixels[finalCellOffset..(finalCellOffset + 3)]);
    }

    [Fact]
    public void NeutralTonePreservesInputExactly()
    {
        var tone = new ToneAdjustment(0, 0);
        foreach (var value in new[] { 0.1, 1d / 18, 0.5, 0.9 })
        {
            Assert.Equal(value, tone.Apply(value));
        }
    }

    [Fact]
    public async Task DefaultsAreWhiteInkOnOpaqueBlack()
    {
        using var input = new MemoryStream(ColorAndPngTests.CreateColorImage());
        var canvas = await new StillImageConverter().ConvertAsync(input, new CharacterImageOptions { OutputWidthInCells = 4 });
        Assert.All(canvas.Cells, cell => Assert.Equal(new RgbColor(255, 255, 255), cell.Color));
        using var png = new MagickImage(await PngExporter.ExportAsync(canvas));
        using var pixels = png.GetPixels();
        Assert.Equal((byte)0, pixels.GetPixel(0, 0).ToColor()!.R);
    }

    [Fact]
    public void ToneChangesGlyphsAndOriginalColorWithoutRecoloringMonoOrBackground()
    {
        var source = new RgbaGrid(3, 1, [0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255]);
        var normal = CharacterImagePipeline.Convert(source, new CharacterImageOptions { CharacterRamp = "@#:. " });
        var bright = CharacterImagePipeline.Convert(source, new CharacterImageOptions { CharacterRamp = "@#:. ", Brightness = 50 });
        Assert.NotEqual(normal.Text, bright.Text);
        Assert.All(bright.Cells, cell => Assert.Equal(new RgbColor(255, 255, 255), cell.Color));
        var color = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Brightness = 50, SourceColors = true });
        Assert.Equal(new RgbColor(128, 128, 128), color.Cells[0].Color);
        var custom = CharacterImagePipeline.Convert(source, new CharacterImageOptions
        {
            MonochromeColor = new RgbColor(0, 255, 255),
            BackgroundColor = new RgbColor(12, 34, 56),
            Contrast = -100
        });
        Assert.Equal(new RgbColor(12, 34, 56), custom.BackgroundColor);
        Assert.All(custom.Cells, cell => Assert.Equal(new RgbColor(0, 255, 255), cell.Color));
    }

    [Fact]
    public void FlatContrastIsIndependentOfSourceAndInvertOnlyChangesGlyphs()
    {
        var source = new RgbaGrid(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]);
        var flat = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Contrast = -100, CharacterRamp = "@:. " });
        Assert.Equal("..", flat.Text);
        var normal = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Brightness = 20, SourceColors = true });
        var inverted = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Brightness = 20, SourceColors = true, Invert = true });
        Assert.NotEqual(normal.Text, inverted.Text);
        Assert.Equal(normal.Cells.Select(cell => cell.Color), inverted.Cells.Select(cell => cell.Color));
    }

    [Theory]
    [InlineData("white")]
    [InlineData("#FFF")]
    [InlineData("#gg0000")]
    [InlineData("#00000000")]
    public void RejectsMalformedColors(string color) => Assert.Throws<ArgumentException>(() => RgbColor.ParseHex(color));

    [Theory]
    [InlineData(-101, 0)]
    [InlineData(101, 0)]
    [InlineData(0, -101)]
    [InlineData(0, 101)]
    public void RejectsOutOfRangeToneBeforeConversion(int contrast, int brightness) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new CharacterImageOptions { Contrast = contrast, Brightness = brightness }.ValidateAndGetRamp());
}

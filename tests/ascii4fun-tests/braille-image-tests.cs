using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class BrailleImageTests
{
    // Unicode dot numbering is column-major for dots 1..6, then dots 7 and 8.
    private static readonly int[] RowMajorBits = [1, 8, 2, 16, 4, 32, 64, 128];

    [Fact]
    public void EveryPatternPreservesTheEightSpatialDotPositions()
    {
        for (var mask = 0; mask < 256; mask++)
        {
            var rgba = RowMajorBits.SelectMany(bit => new byte[]
                { (byte)((mask & bit) == 0 ? 0 : 255), (byte)((mask & bit) == 0 ? 0 : 255), (byte)((mask & bit) == 0 ? 0 : 255), 255 }).ToArray();
            var canvas = CharacterImagePipeline.Convert(new RgbaGrid(2, 4, rgba), Options());
            Assert.Equal(1, canvas.WidthInCells);
            Assert.Equal(1, canvas.HeightInCells);
            Assert.Equal(new Rune(0x2800 + mask), Assert.Single(canvas.Cells).Glyph);
        }
    }

    [Fact]
    public void InversionChangesDotsWithoutChangingGeometryOrColor()
    {
        var source = new RgbaGrid(2, 4, Enumerable.Repeat(new byte[] { 255, 255, 255, 255 }, 8).SelectMany(pixel => pixel).ToArray());
        var light = CharacterImagePipeline.Convert(source, Options());
        var dark = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Style = ImageStyle.Braille });
        Assert.Equal("⣿", light.Text);
        Assert.Equal("⠀", dark.Text);
        Assert.Equal(light.Cells[0].Color, dark.Cells[0].Color);
    }

    [Fact]
    public void ColorAndBackgroundPreserveDotsAndEmptyCells()
    {
        var rgba = Enumerable.Repeat(new byte[] { 255, 0, 0, 255, 0, 0, 0, 255 }, 4).SelectMany(row => row).ToArray();
        var source = new RgbaGrid(2, 4, rgba);
        var mono = CharacterImagePipeline.Convert(source, Options());
        var color = CharacterImagePipeline.Convert(source, new CharacterImageOptions
        {
            Style = ImageStyle.Braille,
            Invert = true,
            SourceColors = true,
            BackgroundColor = new(10, 20, 30)
        });
        Assert.Equal("⡇", color.Text);
        Assert.Equal(mono.Text, color.Text);
        Assert.Equal(new RgbColor(255, 0, 0), color.Cells[0].Color);
        Assert.Equal(new RgbColor(10, 20, 30), color.BackgroundColor);
    }

    [Fact]
    public void BlankBrailleKeepsPhotoPixelsAndTransparentInputKeepsWhiteCompositing()
    {
        var transparent = new RgbaGrid(2, 4, new byte[32]);
        var photo = Enumerable.Repeat(new byte[] { 20, 40, 60, 255 }, 12 * 24).SelectMany(pixel => pixel).ToArray();
        var canvas = CharacterImagePipeline.Convert(transparent,
            new CharacterImageOptions { Style = ImageStyle.Braille, SourcePhotoOpacity = 100 }, photo);
        Assert.Equal("⠀", canvas.Text);
        Assert.Equal(new byte[] { 20, 40, 60 }, CanvasRasterizer.Render(canvas, _ => throw new InvalidOperationException())[..3]);
        Assert.Equal("⣿", CharacterImagePipeline.Convert(transparent, Options()).Text);
    }

    [Fact]
    public async Task NativeSamplingKeepsCellAspectRatioAndExportsTheSameGrid()
    {
        using var image = new MagickImage(MagickColors.White, 8, 16);
        using var input = new MemoryStream(image.ToByteArray(MagickFormat.Png));
        var canvas = await new StillImageConverter().ConvertAsync(input,
            new CharacterImageOptions { Style = ImageStyle.Braille, Invert = true, OutputWidthInCells = 4, SourcePhotoOpacity = 50 });
        Assert.Equal(4, canvas.WidthInCells);
        Assert.Equal(4, canvas.HeightInCells);
        Assert.Equal(string.Join('\n', Enumerable.Repeat("⣿⣿⣿⣿", 4)), canvas.Text);
        using var png = new MagickImage(await PngExporter.ExportAsync(canvas));
        Assert.Equal(48u, png.Width);
        Assert.Equal(96u, png.Height);
    }

    [Fact]
    public void BrailleIgnoresUnusedRampButRejectsInvalidStyleGeometryAndCancellation()
    {
        var source = new RgbaGrid(2, 4, new byte[32]);
        Assert.Equal("⣿", CharacterImagePipeline.Convert(source,
            new CharacterImageOptions { Style = ImageStyle.Braille, Invert = true, CharacterRamp = "" }).Text);
        Assert.Throws<ArgumentOutOfRangeException>(() => CharacterImagePipeline.Convert(source, new CharacterImageOptions { Style = (ImageStyle)99 }));
        Assert.Throws<ArgumentException>(() => CharacterImagePipeline.Convert(new RgbaGrid(3, 4, new byte[48]), Options()));
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        Assert.Throws<OperationCanceledException>(() => CharacterImagePipeline.Convert(source, Options(), cancellationToken: cancellation.Token));
    }

    [Fact]
    public void ToneControlsRunBeforeDotThresholding()
    {
        var source = new RgbaGrid(2, 4, Enumerable.Repeat(new byte[] { 128, 128, 128, 255 }, 8).SelectMany(pixel => pixel).ToArray());
        Assert.Equal("⠀", CharacterImagePipeline.Convert(source, Options()).Text);
        Assert.Equal("⣿", CharacterImagePipeline.Convert(source,
            new CharacterImageOptions { Style = ImageStyle.Braille, Invert = true, Brightness = 40 }).Text);
        Assert.Equal("⣿", CharacterImagePipeline.Convert(source,
            new CharacterImageOptions { Style = ImageStyle.Braille, Invert = true, ShadowLift = 100 }).Text);
        Assert.Equal("⣿", CharacterImagePipeline.Convert(source,
            new CharacterImageOptions { Style = ImageStyle.Braille, Invert = true, Contrast = -100 }).Text);
    }

    [Fact]
    public async Task BrailleRespectsTheExistingOutputWorkLimit()
    {
        using var image = new MagickImage(MagickColors.Black, 1, 100);
        using var input = new MemoryStream(image.ToByteArray(MagickFormat.Png));
        var converter = new StillImageConverter(ConversionLimits.Default with { MaxGridCells = 10 });
        await Assert.ThrowsAsync<InvalidDataException>(() => converter.ConvertAsync(input,
            new CharacterImageOptions { Style = ImageStyle.Braille, OutputWidthInCells = 4 }));
    }

    private static CharacterImageOptions Options() => new() { Style = ImageStyle.Braille, Invert = true };
}

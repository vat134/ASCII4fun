using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Tests;

public sealed class ImageReadabilityTests
{
    [Fact]
    public void PhotoBudgetAllowsTallPortraitsAndRejectsExpansionBeyondItsBound()
    {
        Assert.Equal(40_435_200, SourcePhotoGeometry.ByteLength(180, 195));
        Assert.Equal(47_900_160, SourcePhotoGeometry.ByteLength(180, 231));
        Assert.Throws<InvalidDataException>(() => SourcePhotoGeometry.ByteLength(180, 232));
    }

    [Fact]
    public async Task PhotoLimitRejectsBeforeExpansionWithoutRestrictingTextGrids()
    {
        var encoded = ColorAndPngTests.CreateColorImage();
        var converter = new StillImageConverter();
        using var photoInput = new MemoryStream(encoded);
        var error = await Assert.ThrowsAsync<InvalidDataException>(() => converter.ConvertAsync(photoInput,
            new CharacterImageOptions { OutputWidthInCells = 500, SourcePhotoOpacity = 1 }));
        Assert.Contains("source-photo", error.Message);
        using var textInput = new MemoryStream(encoded);
        var normal = await converter.ConvertAsync(textInput, new CharacterImageOptions { OutputWidthInCells = 500 });
        Assert.Equal(500, normal.WidthInCells);
    }

    [Fact]
    public void ShadowLiftPreservesEndpointsAndNeutralValues()
    {
        var neutral = new ToneAdjustment(0, 0, 0);
        var lifted = new ToneAdjustment(0, 0, 50);
        Assert.Equal(0, lifted.Apply(0));
        Assert.Equal(1, lifted.Apply(1));
        Assert.Equal(0.1, neutral.Apply(0.1));
        Assert.Equal(0.5, lifted.Apply(0.25), 12);
        Assert.True(lifted.Apply(0.1) < lifted.Apply(0.2));
    }

    [Fact]
    public void ShadowLiftRevealsDarkTonesWithoutRecoloringMono()
    {
        var source = new RgbaGrid(4, 1, [0, 0, 0, 255, 48, 48, 48, 255, 80, 80, 80, 255, 255, 255, 255, 255]);
        var normal = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Invert = true });
        var lifted = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Invert = true, ShadowLift = 50 });
        var color = CharacterImagePipeline.Convert(source, new CharacterImageOptions { Invert = true, ShadowLift = 50, SourceColors = true });
        Assert.Equal(' ', lifted.Cells[0].Glyph.Value);
        Assert.NotEqual(normal.Text, lifted.Text);
        Assert.Equal(lifted.Text, color.Text);
        Assert.All(lifted.Cells, cell => Assert.Equal(CharacterImageOptions.DefaultMonochromeColor, cell.Color));
        Assert.True(color.Cells[1].Color.Red > 48);
        Assert.Equal(new RgbColor(0, 0, 0), color.Cells[0].Color);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(101, 0)]
    [InlineData(0, -1)]
    [InlineData(0, 101)]
    public void RejectsOutOfRangeControls(int lift, int opacity)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new CharacterImageOptions
        {
            ShadowLift = lift,
            SourcePhotoOpacity = opacity
        }.ValidateAndGetRamp());
    }

    [Fact]
    public void PhotoBlendsUnderGlyphsAndPreservesText()
    {
        var source = new RgbaGrid(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]);
        var photo = Enumerable.Repeat(new byte[] { 200, 100, 50, 255 }, 24 * 24).SelectMany(pixel => pixel).ToArray();
        var normal = CharacterImagePipeline.Convert(source, new CharacterImageOptions { CharacterRamp = "@ " });
        var composed = CharacterImagePipeline.Convert(source, new CharacterImageOptions
        {
            CharacterRamp = "@ ",
            SourcePhotoOpacity = 50
        }, sourcePhotoRgba: photo);
        Assert.Equal(normal.Text, composed.Text);
        var rgb = CanvasRasterizer.Render(composed, _ => Enumerable.Repeat((byte)128, 12 * 24).ToArray());
        Assert.Equal(new byte[] { 178, 153, 140 }, rgb[..3]);
        Assert.Equal(new byte[] { 100, 50, 25 }, rgb[(12 * 3)..((12 * 3) + 3)]);
    }

    [Fact]
    public void PhotoRequiresExactRasterAndHonorsTransparency()
    {
        var source = new RgbaGrid(1, 1, [255, 255, 255, 255]);
        var options = new CharacterImageOptions { SourcePhotoOpacity = 100, BackgroundColor = new RgbColor(10, 20, 30) };
        Assert.Throws<ArgumentException>(() => CharacterImagePipeline.Convert(source, options));
        Assert.Throws<ArgumentException>(() => CharacterImagePipeline.Convert(source, options, sourcePhotoRgba: [1, 2, 3, 4]));
        var canvas = CharacterImagePipeline.Convert(source, options, sourcePhotoRgba: new byte[12 * 24 * 4]);
        Assert.Equal(new byte[] { 10, 20, 30 }, CanvasRasterizer.Render(canvas, _ => throw new InvalidOperationException())[..3]);
    }

    [Fact]
    public void PhotoCombinesPartialAlphaWithOpacityWithoutToneAdjustment()
    {
        var source = new RgbaGrid(1, 1, [255, 255, 255, 255]);
        var photo = Enumerable.Repeat(new byte[] { 200, 100, 50, 128 }, 12 * 24).SelectMany(pixel => pixel).ToArray();
        var canvas = CharacterImagePipeline.Convert(source, new CharacterImageOptions
        {
            ShadowLift = 100,
            SourcePhotoOpacity = 50,
            BackgroundColor = new RgbColor(10, 20, 30)
        }, photo);
        Assert.Equal(" ", canvas.Text);
        Assert.Equal(new byte[] { 58, 40, 35 }, CanvasRasterizer.Render(canvas, _ => throw new InvalidOperationException())[..3]);
    }
}

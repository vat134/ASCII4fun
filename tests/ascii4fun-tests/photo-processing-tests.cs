using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Tests;

public sealed class PhotoProcessingTests
{
    [Fact]
    public async Task PhotoUsesItsAlphabetAndPreservesColorGeometryAndPngExport()
    {
        var bytes = ColorAndPngTests.CreateColorImage();
        var converter = new StillImageConverter();
        var classic = await converter.ConvertAsync(new MemoryStream(bytes), new CharacterImageOptions { OutputWidthInCells = 16, SourceColors = true });
        var photo = await converter.ConvertAsync(new MemoryStream(bytes), new CharacterImageOptions
        { OutputWidthInCells = 16, SourceColors = true, UsePhotoStyle = true, CharacterRamp = "ignored" });
        Assert.Equal(classic.WidthInCells, photo.WidthInCells);
        Assert.Equal(classic.HeightInCells, photo.HeightInCells);
        Assert.Equal(classic.Cells.Select(cell => cell.Color), photo.Cells.Select(cell => cell.Color));
        Assert.All(photo.Cells, cell => Assert.Contains(cell.Glyph.ToString(), PhotoGlyphMap.Characters, StringComparison.Ordinal));
        Assert.NotEmpty(await PngExporter.ExportAsync(photo));
    }

    [Fact]
    public void LocalToneKeepsUniformFieldsAndStaysBounded()
    {
        var flat = new LuminanceGrid(4, 8, Enumerable.Repeat(.4, 32).ToArray());
        Assert.All(PhotoToneMapper.Enhance(flat, default), value => Assert.Equal(.4, value, 12));
        var edge = new LuminanceGrid(4, 8, Enumerable.Range(0, 32).Select(i => i % 4 < 2 ? 0d : 1d).ToArray());
        Assert.All(PhotoToneMapper.Enhance(edge, default), value => Assert.InRange(value, 0, 1));
    }
    [Fact]
    public void NewOptionsPreserveClassicDefaults()
    {
        var options = new CharacterImageOptions();
        Assert.False(options.UsePhotoStyle);
    }

    [Fact]
    public void SpatialMatchingDistinguishesEqualDensityDirections()
    {
        var matcher = PhotoGlyphMap.Create(glyph =>
        {
            var mask = new byte[288];
            for (var y = 0; y < 24; y++)
                for (var x = 0; x < 12; x++)
                    if ((glyph.Value == '|' && x is >= 4 and < 8) || (glyph.Value == '-' && y is >= 8 and < 16))
                        mask[y * 12 + x] = 255;
            return mask;
        }, default);
        var vertical = Enumerable.Range(0, 32).Select(i => i % 4 is 1 or 2 ? 1d : 0d).ToArray();
        var horizontal = Enumerable.Range(0, 32).Select(i => i / 4 is >= 2 and < 6 ? 1d : 0d).ToArray();
        Assert.Equal('|', matcher.Select(PhotoGlyphMap.Measure(vertical, 4, 8), .5).Value);
        Assert.Equal('-', matcher.Select(PhotoGlyphMap.Measure(horizontal, 4, 8), .5).Value);
    }

    [Fact]
    public void PhotoRequiresBoundedMatchingSamplesAndObservesCancellation()
    {
        Assert.Throws<ArgumentException>(() => CharacterImagePipeline.Convert(new RgbaGrid(1, 1, [0, 0, 0, 255]),
            new CharacterImageOptions { UsePhotoStyle = true }, renderGlyph: MagickGlyphRenderer.Render));
        Assert.Throws<ArgumentOutOfRangeException>(() => PhotoSampleGeometry.Size(500, 500));
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        Assert.Throws<OperationCanceledException>(() => PhotoGlyphMap.Create(MagickGlyphRenderer.Render, cancellation.Token));
    }
}

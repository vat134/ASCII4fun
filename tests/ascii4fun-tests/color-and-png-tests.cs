using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class ColorAndPngTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SourceColorsPreserveGlyphsAndGeometry(bool invert)
    {
        var encoded = CreateColorImage();
        using var monoInput = new MemoryStream(encoded);
        using var colorInput = new MemoryStream(encoded);
        var converter = new StillImageConverter();
        var monochrome = await converter.ConvertAsync(monoInput, new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@█𝔸 ",
            Invert = invert
        });
        var color = await converter.ConvertAsync(colorInput, new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@█𝔸 ",
            Invert = invert,
            SourceColors = true
        });

        Assert.Equal(monochrome.Text, color.Text);
        Assert.Equal(monochrome.WidthInCells, color.WidthInCells);
        Assert.Equal(monochrome.HeightInCells, color.HeightInCells);
        Assert.Equal(4, color.Cells.Count);
        Assert.Equal(
            [new RgbColor(255, 0, 0), new RgbColor(0, 255, 0), new RgbColor(0, 0, 255), new RgbColor(255, 127, 127)],
            color.Cells.Select(cell => cell.Color));
        Assert.All(monochrome.Cells, cell => Assert.Equal(new RgbColor(238, 238, 236), cell.Color));
        Assert.True(((IList<AsciiCell>)color.Cells).IsReadOnly);
    }

    [Fact]
    public async Task FullyTransparentSourceKeepsWhiteCompositingInBothModes()
    {
        using var image = new MagickImage(MagickColors.Transparent, 4, 2);
        using var input = new MemoryStream(image.ToByteArray(MagickFormat.Png));
        var canvas = await new StillImageConverter().ConvertAsync(input, new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@ ",
            SourceColors = true
        });

        Assert.Equal("    ", canvas.Text);
        Assert.All(canvas.Cells, cell => Assert.Equal(new RgbColor(255, 255, 255), cell.Color));
    }

    [Theory]
    [InlineData(255, 0, 0)]
    [InlineData(238, 238, 236)]
    public async Task PngUsesCellColorFixedGeometryAndOpaqueDarkBackground(byte red, byte green, byte blue)
    {
        var color = new RgbColor(red, green, blue);
        var canvas = new AsciiCanvas([new(new Rune('█'), color), new(new Rune(' '), color)], 2, 1);

        var bytes = await PngExporter.ExportAsync(canvas);
        using var png = new MagickImage(bytes);
        Assert.Equal(MagickFormat.Png, png.Format);
        Assert.Equal(24u, png.Width);
        Assert.Equal(24u, png.Height);
        using var pixels = png.GetPixels();
        for (var y = 0; y < 24; y++)
        {
            for (var x = 0; x < 24; x++)
            {
                var actual = pixels.GetPixel(x, y).ToColor()!;
                Assert.Equal(x < 12 ? red : (byte)8, actual.R);
                Assert.Equal(x < 12 ? green : (byte)8, actual.G);
                Assert.Equal(x < 12 ? blue : (byte)8, actual.B);
                Assert.Equal(byte.MaxValue, actual.A);
            }
        }
    }

    [Fact]
    public async Task UnicodeGlyphsHaveDistinctMasksAndKeepTheirCellPositions()
    {
        const string glyphText = "@█▓▒░▙⣿●◕Σム𝔸";
        var color = new RgbColor(238, 238, 236);
        var cells = glyphText.EnumerateRunes().Select(glyph => new AsciiCell(glyph, color)).ToArray();
        var canvas = new AsciiCanvas(cells, cells.Length, 1);
        using var combined = new MagickImage(await PngExporter.ExportAsync(canvas));
        var masks = new HashSet<string>(StringComparer.Ordinal);
        for (var index = 0; index < cells.Length; index++)
        {
            var single = new AsciiCanvas([cells[index]], 1, 1);
            using var expected = new MagickImage(await PngExporter.ExportAsync(single));
            using var actual = combined.CloneArea(index * 12, 0, 12, 24);
            using var expectedPixels = expected.GetPixels();
            using var actualPixels = actual.GetPixels();
            var mask = actualPixels.ToByteArray(PixelMapping.RGB)!;
            Assert.Equal(expectedPixels.ToByteArray(PixelMapping.RGB), mask);
            Assert.Contains(mask, channel => channel > 8);
            Assert.True(masks.Add(Convert.ToHexString(mask)), $"Duplicate glyph mask for {cells[index].Glyph}");
        }

        Assert.Equal(glyphText, canvas.Text);
        Assert.Equal(cells.Length, canvas.Text.EnumerateRunes().Count());
    }

    [Fact]
    public async Task PngRejectsExcessiveRasterBeforeAllocatingAndHonorsCancellation()
    {
        var sideOverflow = new AsciiCanvas([], 1, 250_001);
        var pixelOverflow = new AsciiCanvas([], 500, 501);
        await Assert.ThrowsAsync<InvalidDataException>(() => PngExporter.ExportAsync(sideOverflow));
        await Assert.ThrowsAsync<InvalidDataException>(() => PngExporter.ExportAsync(pixelOverflow));
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => PngExporter.ExportAsync(sideOverflow, cancellation.Token));
    }

    [Fact]
    public async Task PngHasNoClockDependentMetadataAndKeepsTheCellAspectRatio()
    {
        var canvas = new AsciiCanvas([new(new Rune('@'), new RgbColor(255, 0, 0))], 1, 1);
        var bytes = await PngExporter.ExportAsync(canvas);
        Assert.Equal(bytes, await PngExporter.ExportAsync(canvas));
        Assert.Equal(PngExporter.CellWidthInPixels / (double)PngExporter.CellHeightInPixels,
            CharacterImageOptions.DefaultCharacterCellAspectRatio);
        var chunks = new List<string>();
        for (var offset = 8; offset < bytes.Length;)
        {
            var length = System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(bytes.AsSpan(offset, 4));
            chunks.Add(Encoding.ASCII.GetString(bytes, offset + 4, 4));
            offset += length + 12;
        }

        Assert.DoesNotContain("tIME", chunks);
        Assert.DoesNotContain("tEXt", chunks);
    }

    internal static byte[] CreateColorImage()
    {
        byte[] row = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 0, 0, 128];
        using var image = new MagickImage();
        image.ReadPixels(row.Concat(row).ToArray(), new PixelReadSettings(4, 2, StorageType.Char, PixelMapping.RGBA));
        return image.ToByteArray(MagickFormat.Png);
    }
}

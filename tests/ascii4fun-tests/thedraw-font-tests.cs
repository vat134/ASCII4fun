using System.Security.Cryptography;
using System.Buffers.Binary;
using System.Text;
using System.Text.Json;
using Ascii4Fun.Figlet;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class ThedrawFontTests
{
    [Fact]
    public void EverySelectedAssetIsEmbeddedAndMatchesItsProvenanceHash()
    {
        var assembly = typeof(FigletConverter).Assembly;
        using var manifest = assembly.GetManifestResourceStream("Ascii4Fun.Figlet.Fonts.selected-assets.json")!;
        using var document = JsonDocument.Parse(manifest);
        Assert.Equal(208, document.RootElement.GetArrayLength());
        Assert.Equal(227, FigletConverter.Fonts.Count);
        foreach (var asset in document.RootElement.EnumerateArray())
        {
            Assert.Contains(FigletConverter.Fonts, font => font.Id == asset.GetProperty("id").GetString());
            using var stream = assembly.GetManifestResourceStream("Ascii4Fun.Figlet.Fonts." + asset.GetProperty("file").GetString())!;
            Assert.NotNull(stream);
            Assert.Equal(asset.GetProperty("sha256").GetString(), Convert.ToHexStringLower(SHA256.HashData(stream)));
        }
    }

    public static IEnumerable<object[]> ColorGoldens()
    {
        using var stream = typeof(ThedrawFontTests).Assembly.GetManifestResourceStream("Ascii4Fun.Tests.ThedrawColorGoldens.json")!;
        return JsonSerializer.Deserialize<Dictionary<string, string>>(stream)!.Select(entry => new object[] { entry.Key, entry.Value });
    }

    [Theory]
    [MemberData(nameof(ColorGoldens))]
    public void AuthoredColorsMatchIndependentTaagCells(string fontId, string expectedHash)
    {
        var canvas = FigletConverter.Convert("ASCII Text", fontId);
        var colors = canvas.Cells.SelectMany(cell => new byte[] {
            cell.Color.Red, cell.Color.Green, cell.Color.Blue,
            cell.BackgroundColor?.Red ?? 0, cell.BackgroundColor?.Green ?? 0, cell.BackgroundColor?.Blue ?? 0
        }).ToArray();
        Assert.Equal(expectedHash, Convert.ToHexString(SHA256.HashData(colors)));
    }

    [Theory]
    [InlineData("tdf-1911")]
    [InlineData("tdf-boldmedium")]
    [InlineData("tdf-rounded")]
    public async Task ColorOverridePreservesGlyphsBackgroundsAndExport(string fontId)
    {
        var original = FigletConverter.Convert("ASCII Text", fontId);
        var ink = new RgbColor(10, 240, 90);
        var custom = FigletConverter.Convert("ASCII Text", fontId, ink);
        Assert.Equal(original.Text, custom.Text);
        Assert.Equal(original.Cells.Select(c => c.BackgroundColor), custom.Cells.Select(c => c.BackgroundColor));
        Assert.All(custom.Cells, cell => Assert.Equal(ink, cell.Color));
        using var png = new MagickImage(await PngExporter.ExportAsync(original));
        Assert.Equal(original.WidthInCells * PngExporter.CellWidthInPixels, (int)png.Width);
        Assert.Equal(original.HeightInCells * PngExporter.CellHeightInPixels, (int)png.Height);
        Assert.Equal(CanvasRasterizer.Render(original, MagickGlyphRenderer.Render), png.GetPixels().ToByteArray(PixelMapping.RGB));
    }

    [Fact]
    public void ColoredSpacePaintsItsAuthoredBackgroundWithoutAGlyphMask()
    {
        var canvas = new AsciiCanvas([new(new Rune(' '), new(255, 255, 255), new(20, 40, 60))], 1, 1);
        var pixels = CanvasRasterizer.Render(canvas, _ => throw new InvalidOperationException("No space glyph mask."));
        Assert.All(Enumerable.Range(0, 12 * 24), pixel => Assert.Equal(new byte[] { 20, 40, 60 }, pixels.AsSpan(pixel * 3, 3).ToArray()));
    }

    [Fact]
    public void UppercaseLetteringAndMissingUnicodeRemainConsistent()
    {
        Assert.Equal(FigletConverter.Convert("TEXT", "tdf-1911").Text, FigletConverter.Convert("text", "tdf-1911").Text);
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert("猫", "tdf-1911"));
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert("A\tB", "tdf-1911"));
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert(new string('A', 257), "tdf-1911"));
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert(new string('A', 256), "tdf-black"));
        Assert.Throws<OperationCanceledException>(() => FigletConverter.Convert("A", "tdf-1911", cancellationToken: new(true)));
        Assert.Equal(FigletConverter.Convert("A\n\nB", "tdf-1911").Text, FigletConverter.Convert("A\r\n\rB", "tdf-1911").Text);
    }

    [Fact]
    public void InvalidThedrawRecordsFailBeforeReadingOutsideTheBlock()
    {
        using var stream = typeof(FigletConverter).Assembly.GetManifestResourceStream("Ascii4Fun.Figlet.Fonts.tdf-1911.tdf")!;
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        var data = buffer.ToArray();
        Assert.Throws<FormatException>(() => ThedrawFont.Parse(data.AsSpan(0, 30)));
        data[41] = 3;
        Assert.Throws<FormatException>(() => ThedrawFont.Parse(data));
        data[41] = 2;
        data[45] = 254;
        data[46] = 255;
        Assert.Throws<FormatException>(() => ThedrawFont.Parse(data));
    }

    [Fact]
    public void ZeroColorAttributesAreDataAndGlyphTerminatorsCannotSpillIntoTheNextGlyph()
    {
        var font = ThedrawFont.Parse(Record(2, [1, 1, 65, 0, 0]));
        var cell = Assert.Single(Assert.Single(font.Glyphs['A']));
        Assert.Equal(new Rune('A'), cell.Glyph);
        Assert.Equal(new RgbColor(0, 0, 0), cell.Color);
        Assert.Equal(new RgbColor(0, 0, 0), cell.BackgroundColor);
        Assert.Throws<FormatException>(() => ThedrawFont.Parse(Record(2, [1, 1, 65, 7])));
        var overlapping = Record(2, [1, 1, 65, 7, 1, 1, 66, 7, 0]);
        BinaryPrimitives.WriteUInt16LittleEndian(overlapping.AsSpan(45 + ('B' - 33) * 2), 4);
        Assert.Throws<FormatException>(() => ThedrawFont.Parse(overlapping));
    }

    [Theory]
    [InlineData(0, 71, '╓')]
    [InlineData(1, 218, '┌')]
    public void OutlineAndBlockBytesUseTheirOwnMapping(byte type, byte glyph, char expected)
    {
        var font = ThedrawFont.Parse(Record(type, [1, 1, glyph, 0]));
        Assert.Equal(new Rune(expected), font.Glyphs['A'][0][0].Glyph);
        Assert.Null(font.Glyphs['A'][0][0].BackgroundColor);
    }

    private static byte[] Record(byte type, byte[] glyph)
    {
        var data = new byte[233 + glyph.Length];
        data[0] = 19;
        "TheDraw FONTS file"u8.CopyTo(data.AsSpan(1));
        data[19] = 26;
        new byte[] { 85, 170, 0, 255 }.CopyTo(data, 20);
        data[41] = type;
        data[42] = 1;
        BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(43), (ushort)glyph.Length);
        data.AsSpan(45, 188).Fill(255);
        BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(45 + ('A' - 33) * 2), 0);
        glyph.CopyTo(data, 233);
        return data;
    }
}

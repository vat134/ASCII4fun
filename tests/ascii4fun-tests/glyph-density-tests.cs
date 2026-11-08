using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Tests;

public sealed class GlyphDensityTests
{
    [Fact]
    public void ChoosesNearestMeasuredLevelRatherThanRampPosition()
    {
        var ramp = ".#@ ".EnumerateRunes().ToArray();
        var density = GlyphDensityMap.Create(ramp, glyph => glyph.Value switch
        {
            '@' => [100],
            '#' => [50],
            '.' => [20],
            _ => throw new InvalidOperationException()
        }, default);
        var text = string.Concat(new[] { 0d, 0.2, 0.5, 0.7, 0.85, 1 }.Select(value => density.SelectGlyph(value).ToString()));
        Assert.Equal("@@#.. ", text);
        Assert.Equal('@', density.SelectGlyph(0.25).Value);
    }

    [Fact]
    public void MeasuresUniqueUnicodeScalarsAndSkipsEmptyCells()
    {
        var measured = new List<Rune>();
        var density = GlyphDensityMap.Create("𓀀𓀀 \u2800".EnumerateRunes().ToArray(), glyph =>
        {
            measured.Add(glyph);
            return [255];
        }, default);
        Assert.Single(measured);
        Assert.Equal(0x13000, measured[0].Value);
        Assert.Equal(' ', density.SelectGlyph(1).Value);
    }

    [Fact]
    public void EqualDensitySelectsFirstAuthoredGlyph()
    {
        var density = GlyphDensityMap.Create("#@".EnumerateRunes().ToArray(), _ => [128], default);
        Assert.Equal('#', density.SelectGlyph(0).Value);
        Assert.Equal('#', density.SelectGlyph(1).Value);
    }

    [Fact]
    public void DisabledModeNeverMeasuresGlyphs()
    {
        var source = new RgbaGrid(2, 1, [0, 0, 0, 255, 255, 255, 255, 255]);
        var canvas = CharacterImagePipeline.Convert(source, new CharacterImageOptions { CharacterRamp = "@ " },
            renderGlyph: _ => throw new InvalidOperationException("Disabled mode must not render glyphs."));
        Assert.Equal("@ ", canvas.Text);
    }

    [Fact]
    public async Task MeasuredModePreservesGeometryAndSourceColorsAndExportsPng()
    {
        var encoded = ColorAndPngTests.CreateColorImage();
        using var input = new MemoryStream(encoded);
        var converter = new StillImageConverter();
        var baseline = await converter.ConvertAsync(input, new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = ".@ ",
            SourceColors = true,
            Invert = true
        });
        input.Position = 0;
        var measured = await converter.ConvertAsync(input, new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = ".@ ",
            SourceColors = true,
            Invert = true,
            UseMeasuredGlyphDensity = true
        });
        Assert.NotEqual(baseline.Text, measured.Text);
        Assert.Equal(baseline.WidthInCells, measured.WidthInCells);
        Assert.Equal(baseline.HeightInCells, measured.HeightInCells);
        Assert.Equal(baseline.Cells.Select(cell => cell.Color), measured.Cells.Select(cell => cell.Color));
        Assert.NotEmpty(await PngExporter.ExportAsync(measured));
    }

    [Fact]
    public void DensityWorkIsBoundedAndCancellable()
    {
        var ramp = string.Concat(Enumerable.Range(0x100, 257).Select(value => new Rune(value).ToString()));
        Assert.Throws<ArgumentException>(() => new CharacterImageOptions
        {
            CharacterRamp = ramp,
            UseMeasuredGlyphDensity = true
        }.ValidateAndGetRamp());
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        Assert.Throws<OperationCanceledException>(() => GlyphDensityMap.Create("@ ".EnumerateRunes().ToArray(),
            _ => throw new InvalidOperationException(), cancellation.Token));
    }
}

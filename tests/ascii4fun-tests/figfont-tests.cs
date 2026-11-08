using System.Text;
using Ascii4Fun.Figlet;

namespace Ascii4Fun.Tests;

public sealed class FigfontTests
{
    private static readonly int[] RequiredGermanCodes = [196, 214, 220, 228, 246, 252, 223];
    [Theory]
    [InlineData(0, " A  B ")]
    [InlineData(64, " AB ")]
    public void FullWidthAndFittingRespectGlyphBoundaries(int layout, string expected)
    {
        var font = Figfont.Parse(BuildFont(layout, new() { ['A'] = " A ", ['B'] = " B " }));
        Assert.Equal(expected, FigletRenderer.Render("AB", font, new(255, 255, 255), default).Text);
    }

    [Theory]
    [InlineData(129, "X", "X", "X")]
    [InlineData(130, "_", "|", "|")]
    [InlineData(132, "|", ">", ">")]
    [InlineData(136, "]", "[", "|")]
    [InlineData(144, "/", "\\", "|")]
    [InlineData(144, "\\", "/", "Y")]
    [InlineData(144, ">", "<", "X")]
    [InlineData(160, "$", "$", " ")]
    [InlineData(128, "$", "X", " X")]
    [InlineData(128, "X", "$", "X ")]
    [InlineData(128, "X", "Y", "Y")]
    [InlineData(129, "X", "Y", "XY")]
    [InlineData(129, "$", "$", "  ")]
    public void HorizontalSmushingAppliesOnlyAllowedCollisions(int layout, string left, string right, string expected)
    {
        var font = Figfont.Parse(BuildFont(layout, new() { ['A'] = left, ['B'] = right }));
        Assert.Equal(expected, FigletRenderer.Render("AB", font, new(255, 255, 255), default).Text);
    }

    [Fact]
    public void HardblanksProtectSpacingBeforeTheyBecomeSpaces()
    {
        var font = Figfont.Parse(BuildFont(64, new() { ['A'] = "$X$", ['B'] = "$Y$" }));
        Assert.Equal(" X  Y ", FigletRenderer.Render("AB", font, new(255, 255, 255), default).Text);
    }

    [Theory]
    [InlineData(0, "BA")]
    [InlineData(128, "B")]
    public void RightToLeftPrintDirectionKeepsTheLaterGlyphInFront(int layout, string expected)
    {
        var font = Figfont.Parse(BuildFont(layout, new() { ['A'] = "A", ['B'] = "B" }, 1));
        Assert.Equal(expected, FigletRenderer.Render("AB", font, new(255, 255, 255), default).Text);
    }

    [Fact]
    public void CodeTaggedSupplementaryGlyphUsesOneCanvasCell()
    {
        var font = Figfont.Parse(BuildFont(0, new()) + "0x1F600 GRINNING FACE\n😀@@\n");
        var canvas = FigletRenderer.Render("😀", font, new(255, 255, 255), default);
        Assert.Equal(1, canvas.WidthInCells);
        Assert.Equal(0x1F600, canvas.Cells[0].Glyph.Value);
        Assert.Equal(256, FigletRenderer.Render(string.Concat(Enumerable.Repeat("😀", 256)), font, new(255, 255, 255), default).WidthInCells);
    }

    [Theory]
    [InlineData("--65")]
    [InlineData("++65")]
    [InlineData("0x")]
    [InlineData("08")]
    [InlineData("-1")]
    [InlineData("2147483648")]
    public void InvalidCodeTagsAreRejected(string tag) =>
        Assert.Throws<FormatException>(() => Figfont.Parse(BuildFont(0, new()) + tag + "\nX@@\n"));

    [Theory]
    [InlineData("0x1F600")]
    [InlineData("0373000")]
    [InlineData("128512")]
    public void HexadecimalOctalAndDecimalTagsIdentifyTheSameScalar(string tag)
    {
        var font = Figfont.Parse(BuildFont(0, new()) + tag + "\nX@@\n");
        Assert.Equal("X", FigletRenderer.Render("😀", font, new(255, 255, 255), default).Text);
    }

    [Fact]
    public void MissingGlyphPolicyDoesNotUseTheFontZeroFallback()
    {
        var font = Figfont.Parse(BuildFont(0, new()) + "0 fallback\nX@@\n");
        Assert.Throws<ArgumentException>(() => FigletRenderer.Render("😀", font, new(255, 255, 255), default));
    }

    [Fact]
    public void GlyphCountBoundIncludesRepeatedCodeTags()
    {
        var excessTags = string.Concat(Enumerable.Repeat("65 replacement\nX@@\n", 3995));
        Assert.Throws<FormatException>(() => Figfont.Parse(BuildFont(0, new()) + excessTags));
    }

    [Theory]
    [InlineData("flf2a$ 0 1 10 -1 0\n")]
    [InlineData("tlf2a$ 1 1 10 -1 0\n")]
    [InlineData("flf2a$ 1 2 10 -1 0\n")]
    [InlineData("flf2a$ 1 1 100000 -1 0\n")]
    [InlineData("flf2a$ 1 1 10 -1 100000\n")]
    [InlineData("flf2a$ 1 1 10 -1 0 2\n")]
    [InlineData("flf2a$ 1 1 10 -1 0\n")]
    public void MalformedFontsHaveFieldOrGlyphErrors(string content) =>
        Assert.Throws<FormatException>(() => Figfont.Parse(content));

    [Fact]
    public void TruncatedInconsistentAndOversizedDataAreRejected()
    {
        Assert.Throws<FormatException>(() => Figfont.Parse(BuildFont(0, new()) + "0x1F600\n"));
        Assert.Throws<FormatException>(() => Figfont.Parse(new string('X', 1_048_577)));
        var inconsistent = BuildFont(0, new()).Replace("1 1 258", "2 1 258", StringComparison.Ordinal);
        Assert.Throws<FormatException>(() => Figfont.Parse(inconsistent));
    }

    [Fact]
    public void LastCodeTagReplacesAnEarlierGlyphAsRequiredByTheSpec()
    {
        var font = Figfont.Parse(BuildFont(0, new() { ['A'] = "A" }) + "65 replacement\nX@@\n");
        Assert.Equal("X", FigletRenderer.Render("A", font, new(255, 255, 255), default).Text);
    }

    [Fact]
    public void InvalidUnicodeErrorIdentifiesTheFontGlyph()
    {
        var error = Assert.Throws<FormatException>(() => Figfont.Parse(BuildFont(0, new()) + "65\n" + new string((char)0xD800, 1) + "@@\n"));
        Assert.Contains("glyph 65", error.Message, StringComparison.Ordinal);
    }

    private static string BuildFont(int layout, Dictionary<int, string> glyphs, int direction = 0)
    {
        var result = new StringBuilder($"flf2a$ 1 1 258 -1 0 {direction} {layout}\n");
        foreach (var code in Enumerable.Range(32, 95).Concat(RequiredGermanCodes))
        {
            result.Append(glyphs.GetValueOrDefault(code, "$")).Append("@@\n");
        }
        return result.ToString();
    }
}

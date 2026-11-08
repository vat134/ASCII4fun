using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Ascii4Fun.Figlet;
using Ascii4Fun.Images;

namespace Ascii4Fun.Tests;

public sealed class FigletConverterTests
{
    private static readonly string[] FontCategories = ["3D & Iso", "Banners", "Clean & Terminal", "Stylized & Retro", "TheDraw Outline", "TheDraw Block", "TheDraw Color", "AOL Macro"];

    [Fact]
    public void ForegroundColorPreservesGlyphsAndGeometry()
    {
        var original = FigletConverter.Convert("ASCII Text", "linguaholic-neon");
        var color = new RgbColor(51, 255, 170);
        var colored = FigletConverter.Convert("ASCII Text", "linguaholic-neon", color);
        Assert.Equal(original.Text, colored.Text);
        Assert.Equal(original.WidthInCells, colored.WidthInCells);
        Assert.Equal(original.HeightInCells, colored.HeightInCells);
        Assert.Equal(original.BackgroundColor, colored.BackgroundColor);
        Assert.All(colored.Cells, cell => Assert.Equal(color, cell.Color));
    }

    [Fact]
    public void MiniBlockPreservesReadableLettersAndTrailingSpaces()
    {
        Assert.Equal("█  █ ▀ \n█▀▀█ █ \n▀  ▀ ▀ \n       ", FigletConverter.Convert("Hi", "linguaholic-mini-block").Text);
    }

    [Fact]
    public void PaggaMatchesTheOwnerReference()
    {
        const string expected = """
            ░█▀█░█░█░█▀█░█▀█░▀█▀░█░█░░░▀█▀░█▀█░█▀█░█░░░█▀▀
            ░█▀█░▄▀▄░█░█░█░█░░█░░▄▀▄░░░░█░░█░█░█░█░█░░░▀▀█
            ░▀░▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░░░░▀░░▀▀▀░▀▀▀░▀▀▀░▀▀▀
            """;
        Assert.Equal(expected, FigletConverter.Convert("AXONIX TOOLS", "pagga").Text);
    }

    public static IEnumerable<object[]> FontGoldens()
    {
        using var stream = typeof(FigletConverterTests).Assembly.GetManifestResourceStream("Ascii4Fun.Tests.FigletFontGoldens.json")!;
        return JsonSerializer.Deserialize<Dictionary<string, string>>(stream)!.Select(entry => new object[] { entry.Key, entry.Value });
    }

    // Independent figlet.js 1.12.0 output, padded to a rectangular Rune grid.
    [Theory]
    [MemberData(nameof(FontGoldens))]
    public void BundledFontLayoutMatchesReferenceGolden(string fontId, string expectedHash)
    {
        var text = FigletConverter.Convert("ASCII Text", fontId).Text;
        if (fontId != "small-braille") Assert.DoesNotContain('\u2800', text);
        Assert.Equal(expectedHash, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text))));
    }

    public static IEnumerable<object[]> SelectionGoldens()
    {
        using var stream = typeof(FigletConverterTests).Assembly.GetManifestResourceStream("Ascii4Fun.Tests.FigletSelectionGoldens.json")!;
        return JsonSerializer.Deserialize<string[][]>(stream)!.Select(row => row.Cast<object>().ToArray());
    }

    [Theory]
    [MemberData(nameof(SelectionGoldens))]
    public void SelectedFontsPreserveAlphabetAndDigitLayouts(string fontId, string input, string expectedHash)
    {
        var text = FigletConverter.Convert(input, fontId).Text;
        Assert.DoesNotContain('\ue000', text);
        Assert.DoesNotContain('\ue001', text);
        Assert.Equal(expectedHash, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text))));
    }

    [Fact]
    public void BundledFontsRenderDistinctRectangularRuneCanvases()
    {
        Assert.All(FigletConverter.Fonts, font =>
        {
            Assert.False(string.IsNullOrWhiteSpace(font.Category));
            Assert.Contains(font.Category, FontCategories);
        });
        var outputs = FigletConverter.Fonts.Select(font => FigletConverter.Convert("ASCII Text", font.Id)).ToArray();
        Assert.Equal(FigletConverter.Fonts.Select(font => font.Id).Order(), FontGoldens().Select(row => (string)row[0]).Order());
        Assert.Equal(FigletConverter.Fonts.Count, FigletConverter.Fonts.Select(font => font.Id).Distinct(StringComparer.Ordinal).Count());
        Assert.All(outputs, canvas =>
        {
            Assert.Equal(canvas.WidthInCells * canvas.HeightInCells, canvas.Cells.Count);
            Assert.All(canvas.Text.Split('\n'), row => Assert.Equal(canvas.WidthInCells, row.EnumerateRunes().Count()));
            Assert.DoesNotContain('\r', canvas.Text);
        });
    }

    [Fact]
    public void LineEndingsAndEmptyLinesArePreservedWithoutWrapping()
    {
        var lf = FigletConverter.Convert("A\n\nB", "linguaholic-mini-block");
        Assert.Equal(lf.Text, FigletConverter.Convert("A\r\n\rB", "linguaholic-mini-block").Text);
        Assert.Equal(12, lf.HeightInCells);
        Assert.All(lf.Text.Split('\n').Skip(4).Take(4), row => Assert.All(row.EnumerateRunes(), glyph => Assert.Equal(new Rune(' '), glyph)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("😀")]
    [InlineData("Привет")]
    [InlineData("\t")]
    [InlineData("\ud800")]
    public void UnsupportedOrEmptyInputIsRejectedExplicitly(string text) =>
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert(text, "linguaholic-neon"));

    [Fact]
    public void MissingGlyphErrorIdentifiesTheUnicodeScalar()
    {
        var error = Assert.Throws<ArgumentException>(() => FigletConverter.Convert("😀", "linguaholic-neon"));
        Assert.Contains("U+1F600", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void InputAndOutputWorkAreBounded()
    {
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert(new string('A', 257), "linguaholic-neon"));
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert("A\n\n\n\n\n\n\n\n", "linguaholic-neon"));
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert(new string('W', 249) + "\n\n\n\n\n\n\n", "linguaholic-neon"));
        Assert.NotEmpty(FigletConverter.Convert(new string('A', 256), "linguaholic-mini-block").Cells);
    }

    [Fact]
    public void UnknownFontsAndCancellationAreNotSilentlyReplaced()
    {
        Assert.Throws<ArgumentException>(() => FigletConverter.Convert("A", "not-a-font"));
        using var source = new CancellationTokenSource();
        source.Cancel();
        Assert.Throws<OperationCanceledException>(() => FigletConverter.Convert("A", "linguaholic-neon", cancellationToken: source.Token));
    }
}

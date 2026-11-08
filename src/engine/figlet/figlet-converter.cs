using System.Text;
using Ascii4Fun.Images;

namespace Ascii4Fun.Figlet;

/// <summary>Renders bounded text using bundled FIGfont v2 and TheDraw fonts with their authored layouts.</summary>
public static class FigletConverter
{
    /// <summary>The read-only catalog of bundled fonts, ordered for display.</summary>
    public static IReadOnlyList<FigletFontInfo> Fonts => TextFontCatalog.Fonts;

    /// <summary>Gets distinct authored glyph and cell-background colors across the entire font, ordered by RGB value.</summary>
    /// <param name="fontId">An identifier from <see cref="Fonts"/>.</param>
    /// <param name="cancellationToken">Cancels palette extraction.</param>
    /// <returns>A read-only palette independent of the input text; FIGlet fonts use white.</returns>
    /// <exception cref="ArgumentException">The font identifier is invalid.</exception>
    /// <exception cref="OperationCanceledException">Cancellation was requested.</exception>
    public static IReadOnlyList<RgbColor> GetFontPalette(string fontId, CancellationToken cancellationToken = default)
    {
        ValidateFont(fontId, cancellationToken);
        return fontId.StartsWith("tdf-", StringComparison.Ordinal)
            ? TextFontPalette.Extract(ReadThedrawFont(fontId), cancellationToken)
            : Array.AsReadOnly(new[] { new RgbColor(255, 255, 255) });
    }

    /// <summary>Converts text to a rectangular canvas on black without automatic wrapping.</summary>
    /// <param name="text">Nonempty text with at most 256 Unicode scalars and 8 lines. CRLF and CR normalize to LF.</param>
    /// <param name="fontId">An identifier from <see cref="Fonts"/>.</param>
    /// <param name="foregroundColor">The glyph color; null preserves authored TheDraw colors and uses white for FIGlet. Does not change glyphs or layout.</param>
    /// <param name="cancellationToken">Cancels conversion before or during text layout.</param>
    /// <param name="colorReplacements">Optional authored-color replacements for glyphs and cell backgrounds. Applied simultaneously, without changing the canvas background. Cannot be combined with a foreground override.</param>
    /// <returns>The shared glyph canvas, with at most 32,768 cells and 4,096 columns.</returns>
    /// <exception cref="ArgumentException">Text, font, Unicode coverage, or output dimensions are invalid.</exception>
    /// <exception cref="OperationCanceledException">Cancellation was requested.</exception>
    public static AsciiCanvas Convert(string text, string fontId, RgbColor? foregroundColor = null,
        IReadOnlyDictionary<RgbColor, RgbColor>? colorReplacements = null, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(text);
        ValidateFont(fontId, cancellationToken);
        if (foregroundColor is not null && colorReplacements is { Count: > 0 })
            throw new ArgumentException("Choose either a foreground override or authored-color replacements.", nameof(colorReplacements));
        if (fontId.StartsWith("tdf-", StringComparison.Ordinal))
        {
            var thedraw = ReadThedrawFont(fontId);
            var canvas = ThedrawRenderer.Render(text, thedraw, foregroundColor, cancellationToken);
            return TextFontPalette.Replace(canvas, colorReplacements, () => TextFontPalette.Extract(thedraw, cancellationToken), cancellationToken);
        }
        using var stream = typeof(FigletConverter).Assembly.GetManifestResourceStream($"Ascii4Fun.Figlet.Fonts.{fontId}.flf")
            ?? throw new InvalidOperationException($"Bundled FIGfont '{fontId}' is missing from the assembly.");
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var font = Figfont.Parse(reader.ReadToEnd());
        var result = FigletRenderer.Render(text, font, foregroundColor ?? new RgbColor(255, 255, 255), cancellationToken);
        return TextFontPalette.Replace(result, colorReplacements, () => GetFontPalette(fontId, cancellationToken), cancellationToken);
    }

    private static void ValidateFont(string fontId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(fontId);
        cancellationToken.ThrowIfCancellationRequested();
        if (!Fonts.Any(font => string.Equals(font.Id, fontId, StringComparison.Ordinal)))
            throw new ArgumentException("Choose a bundled FIGlet font.", nameof(fontId));
    }

    private static ThedrawFont ReadThedrawFont(string fontId)
    {
        using var data = typeof(FigletConverter).Assembly.GetManifestResourceStream($"Ascii4Fun.Figlet.Fonts.{fontId}.tdf")
            ?? throw new InvalidOperationException($"Bundled TheDraw font '{fontId}' is missing from the assembly.");
        using var buffer = new MemoryStream();
        data.CopyTo(buffer);
        return ThedrawFont.Parse(buffer.ToArray());
    }
}

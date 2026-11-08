using System.Buffers;
using System.Globalization;
using System.Text;

namespace Ascii4Fun.Figlet;

internal sealed record Figfont(Rune Hardblank, int HeightInCells, int Layout, bool RightToLeft,
    IReadOnlyDictionary<int, Rune[][]> Glyphs)
{
    private const int MaxFontLength = 1_048_576;
    // The selected ASCII/Mono fonts contain roughly 3,000 code-tagged glyphs.
    private const int MaxGlyphs = 4096;
    private const int MaxGlyphWidthInCells = 256;
    private static readonly int[] RequiredGermanCodes = [196, 214, 220, 228, 246, 252, 223];

    internal static Figfont Parse(string content)
    {
        if (content.Length > MaxFontLength)
            throw new FormatException("FIGfont exceeds the 1 MiB text limit.");
        using var reader = new StringReader(content);
        var fields = (reader.ReadLine() ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (fields.Length < 6 || !fields[0].StartsWith("flf2a", StringComparison.Ordinal))
            throw new FormatException("FIGfont signature must be flf2a followed by a hardblank.");
        var hardblankRunes = ReadRunes(fields[0][5..], "hardblank");
        if (hardblankRunes.Length != 1 || Rune.IsWhiteSpace(hardblankRunes[0]) || hardblankRunes[0].Value == 0)
            throw new FormatException("FIGfont hardblank must be one non-whitespace scalar.");

        var height = ReadField(fields, 1, "height", 1, 32);
        _ = ReadField(fields, 2, "baseline", 1, height);
        _ = ReadField(fields, 3, "maximum length", 1, MaxGlyphWidthInCells + 2);
        var oldLayout = ReadField(fields, 4, "old layout", -1, 63);
        var comments = ReadField(fields, 5, "comment lines", 0, 256);
        var direction = fields.Length > 6 ? ReadField(fields, 6, "print direction", 0, 1) : 0;
        var layout = fields.Length > 7 ? ReadField(fields, 7, "full layout", 0, 32767)
            : oldLayout < 0 ? 0 : oldLayout == 0 ? 64 : 128 | oldLayout;
        if (fields.Length > 8)
            _ = ReadField(fields, 8, "code tag count", 0, MaxGlyphs - 102);

        for (var index = 0; index < comments; index++)
            if (reader.ReadLine() is null)
                throw new FormatException("FIGfont comment lines are truncated.");

        var glyphs = new Dictionary<int, Rune[][]>();
        foreach (var code in Enumerable.Range(32, 95).Concat(RequiredGermanCodes))
            glyphs.Add(code, ReadGlyph(reader, height, code));

        // Some published fonts understate these metadata fields. Bound actual rows and glyphs
        // instead of using Max_Length or Codetag_Count as an allocation size or truncation point.
        var glyphCount = 102;
        while (reader.ReadLine() is { } tag)
        {
            if (string.IsNullOrWhiteSpace(tag))
                continue;
            if (glyphCount++ >= MaxGlyphs)
                throw new FormatException("FIGfont exceeds 4096 glyphs.");
            var code = ReadCodeTag(tag);
            glyphs[code] = ReadGlyph(reader, height, code);
        }
        return new Figfont(hardblankRunes[0], height, layout, direction == 1, glyphs);
    }

    private static int ReadField(string[] fields, int index, string name, int minimum, int maximum)
    {
        if (!int.TryParse(fields[index], NumberStyles.Integer, CultureInfo.InvariantCulture, out var value) ||
            value < minimum || value > maximum)
            throw new FormatException($"FIGfont {name} must be between {minimum} and {maximum}.");
        return value;
    }

    private static int ReadCodeTag(string tag)
    {
        var token = tag.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)[0];
        var sign = token.StartsWith('-') ? -1 : 1;
        var digits = token[0] is '-' or '+' ? token[1..] : token;
        var radix = digits.StartsWith("0x", StringComparison.OrdinalIgnoreCase) ? 16
            : digits.Length > 1 && digits[0] == '0' ? 8 : 10;
        if (radix == 16)
            digits = digits[2..];
        long value = 0;
        if (digits.Length == 0 || digits.Length > 11)
            throw new FormatException("FIGfont code tag is invalid.");
        foreach (var digit in digits)
        {
            var number = digit is >= '0' and <= '9' ? digit - '0'
                : digit is >= 'a' and <= 'f' ? digit - 'a' + 10
                : digit is >= 'A' and <= 'F' ? digit - 'A' + 10 : -1;
            if (number < 0 || number >= radix)
                throw new FormatException("FIGfont code tag is invalid.");
            value = value * radix + number;
        }
        value *= sign;
        if (value is < int.MinValue or > int.MaxValue or -1)
            throw new FormatException("FIGfont code tag is outside the supported integer range.");
        return (int)value;
    }

    private static Rune[][] ReadGlyph(StringReader reader, int height, int code)
    {
        var rows = new Rune[height][];
        for (var row = 0; row < height; row++)
        {
            var line = reader.ReadLine() ?? throw new FormatException($"FIGfont glyph {code} is truncated.");
            if (line.Length > (MaxGlyphWidthInCells + 2) * 2)
                throw new FormatException($"FIGfont glyph {code} exceeds 256 cells per row.");
            var runes = ReadRunes(line, $"glyph {code}");
            if (runes.Length == 0 || Rune.IsWhiteSpace(runes[^1]))
                throw new FormatException($"FIGfont glyph {code} is missing a row endmark.");
            var end = runes.Length - 1;
            while (end > 0 && runes[end - 1] == runes[^1])
                end--;
            if (end > MaxGlyphWidthInCells || runes.Length - end > 2)
                throw new FormatException($"FIGfont glyph {code} has an invalid width or endmark.");
            rows[row] = runes[..end];
            // Legacy fonts can have ragged rows. Layout preserves them and pads only the final canvas.
        }
        return rows;
    }

    private static Rune[] ReadRunes(string text, string context)
    {
        var runes = new List<Rune>();
        var remaining = text.AsSpan();
        while (!remaining.IsEmpty)
        {
            if (Rune.DecodeFromUtf16(remaining, out var rune, out var consumed) != OperationStatus.Done ||
                Rune.IsControl(rune))
                throw new FormatException($"FIGfont {context} contains invalid Unicode or a control character.");
            runes.Add(rune);
            remaining = remaining[consumed..];
        }
        return runes.ToArray();
    }
}

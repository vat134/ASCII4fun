using System.Buffers;
using System.Text;

namespace Ascii4Fun.Figlet;

internal static class TextInput
{
    private const int MaxInputRunes = 256;
    private const int MaxInputLines = 8;
    private const int MaxUtf16UnitsPerRune = 2;
    internal const int MaxOutputCells = 32_768;
    internal const int MaxOutputWidthInCells = 4096;

    internal static string[] Lines(string text)
    {
        if (text.Length == 0 || text.Length > MaxInputRunes * MaxUtf16UnitsPerRune)
            throw new ArgumentException($"Enter 1–{MaxInputRunes} characters on at most {MaxInputLines} lines.", nameof(text));
        var normalized = text.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
        var remaining = normalized.AsSpan();
        var runeCount = 0;
        var lineCount = 1;
        while (!remaining.IsEmpty)
        {
            if (Rune.DecodeFromUtf16(remaining, out var rune, out var consumed) != OperationStatus.Done)
                throw new ArgumentException("Text contains invalid Unicode.", nameof(text));
            runeCount++;
            if (rune.Value == '\n') lineCount++;
            else if (Rune.IsControl(rune))
                throw new ArgumentException("Text contains an unsupported control character.", nameof(text));
            if (runeCount > MaxInputRunes || lineCount > MaxInputLines)
                throw new ArgumentException($"Enter at most {MaxInputRunes} characters on at most {MaxInputLines} lines.", nameof(text));
            remaining = remaining[consumed..];
        }
        return normalized.Split('\n');
    }

    internal static void ValidateOutput(int widthInCells, int heightInCells)
    {
        if (widthInCells > MaxOutputWidthInCells || (long)widthInCells * heightInCells > MaxOutputCells)
            throw new ArgumentException(FormattableString.Invariant(
                $"Text output exceeds {MaxOutputWidthInCells:N0} columns or {MaxOutputCells:N0} cells. Shorten the text or choose a smaller font."));
    }
}

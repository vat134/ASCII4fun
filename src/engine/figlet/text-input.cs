using System.Buffers;
using System.Text;

namespace Ascii4Fun.Figlet;

internal static class TextInput
{
    internal const int MaxOutputCells = 32_768;
    internal const int MaxOutputWidthInCells = 4096;

    internal static string[] Lines(string text)
    {
        if (text.Length is 0 or > 512)
            throw new ArgumentException("Enter 1–256 characters on at most 8 lines.", nameof(text));
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
            if (runeCount > 256 || lineCount > 8)
                throw new ArgumentException("Enter at most 256 characters on at most 8 lines.", nameof(text));
            remaining = remaining[consumed..];
        }
        return normalized.Split('\n');
    }

    internal static void ValidateOutput(int widthInCells, int heightInCells)
    {
        if (widthInCells > MaxOutputWidthInCells || (long)widthInCells * heightInCells > MaxOutputCells)
            throw new ArgumentException("Text output exceeds 4,096 columns or 32,768 cells. Shorten the text or choose a smaller font.");
    }
}

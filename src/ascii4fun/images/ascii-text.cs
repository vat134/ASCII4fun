namespace Ascii4Fun.Images;

/// <summary>
/// Represents a rectangular plain-text ASCII result.
/// </summary>
public sealed class AsciiText
{
    internal AsciiText(string text, int widthInCells, int heightInCells)
    {
        Text = text;
        WidthInCells = widthInCells;
        HeightInCells = heightInCells;
    }

    /// <summary>
    /// Gets the text with line-feed row separators and no trailing line break.
    /// </summary>
    public string Text { get; }

    /// <summary>
    /// Gets the width measured in character cells.
    /// </summary>
    public int WidthInCells { get; }

    /// <summary>
    /// Gets the height measured in character cells.
    /// </summary>
    public int HeightInCells { get; }

    /// <inheritdoc />
    public override string ToString() => Text;
}

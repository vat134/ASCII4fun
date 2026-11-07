using System.Text;

namespace Ascii4Fun.Images;

/// <summary> An immutable rectangular grid of glyphs and colors, independent of its export format. </summary>
public sealed class AsciiCanvas
{
    internal AsciiCanvas(AsciiCell[] cells, int widthInCells, int heightInCells)
    {
        Cells = Array.AsReadOnly(cells);
        WidthInCells = widthInCells;
        HeightInCells = heightInCells;
    }

    /// <summary> The cells in row-major order, including empty space glyphs. </summary>
    public IReadOnlyList<AsciiCell> Cells { get; }

    /// <summary> The width in character cells. </summary>
    public int WidthInCells { get; }

    /// <summary> The height in character cells. </summary>
    public int HeightInCells { get; }

    /// <summary> Glyph-only projection, with LF separators and no trailing line break. </summary>
    public string Text
    {
        get
        {
            var text = new StringBuilder((WidthInCells + 1) * HeightInCells);
            for (var index = 0; index < Cells.Count; index++)
            {
                if (index > 0 && index % WidthInCells == 0)
                {
                    text.Append('\n');
                }

                text.Append(Cells[index].Glyph.ToString());
            }

            return text.ToString();
        }
    }

    /// <inheritdoc />
    public override string ToString() => Text;
}

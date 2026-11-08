using System.Buffers.Binary;
using System.Text;
using Ascii4Fun.Images;

namespace Ascii4Fun.Figlet;

internal sealed record ThedrawFont(int LetterSpacingInCells, IReadOnlyDictionary<int, AsciiCell[][]> Glyphs)
{
    private const int HeaderLength = 233;
    private static readonly RgbColor[] Palette = [
        new(0, 0, 0), new(0, 0, 170), new(0, 170, 0), new(0, 170, 170),
        new(170, 0, 0), new(170, 0, 170), new(170, 85, 0), new(170, 170, 170),
        new(85, 85, 85), new(85, 85, 255), new(85, 255, 85), new(85, 255, 255),
        new(255, 85, 85), new(255, 85, 255), new(255, 255, 85), new(255, 255, 255)
    ];

    internal static ThedrawFont Parse(ReadOnlySpan<byte> data)
    {
        if (data.Length is < HeaderLength or > 65_768 || data[0] != 19 ||
            !data.Slice(1, 18).SequenceEqual("TheDraw FONTS file"u8) || data[19] != 26 ||
            !data.Slice(20, 4).SequenceEqual((ReadOnlySpan<byte>)[85, 170, 0, 255]))
            throw new FormatException("TheDraw font header is invalid.");
        var type = data[41];
        if (data[24] > 12 || type > 2 || data[42] is < 1 or > 41 ||
            HeaderLength + BinaryPrimitives.ReadUInt16LittleEndian(data[43..]) != data.Length)
            throw new FormatException("TheDraw font type, spacing or block size is invalid.");
        var offsets = new int[94];
        for (var index = 0; index < offsets.Length; index++)
            offsets[index] = BinaryPrimitives.ReadUInt16LittleEndian(data[(45 + index * 2)..]);
        var glyphs = new Dictionary<int, AsciiCell[][]>();
        for (var code = 33; code <= 126; code++)
        {
            var offset = offsets[code - 33];
            if (offset == ushort.MaxValue) continue;
            var start = HeaderLength + offset;
            if (start + 2 >= data.Length)
                throw new FormatException("TheDraw glyph offset is outside the font block.");
            var end = data.Length;
            foreach (var nextOffset in offsets)
                if (nextOffset != ushort.MaxValue && nextOffset > offset)
                    end = Math.Min(end, HeaderLength + nextOffset);
            if (end <= start + 2)
                throw new FormatException("TheDraw glyph overlaps another glyph header.");
            glyphs.Add(code, ReadGlyph(data[(start + 2)..end], type));
        }
        return new ThedrawFont(data[42] - 1, glyphs);
    }

    private static AsciiCell[][] ReadGlyph(ReadOnlySpan<byte> data, int type)
    {
        var rows = new List<AsciiCell[]>();
        var row = new List<AsciiCell>();
        for (var position = 0; position < data.Length; position++)
        {
            var code = data[position];
            if (code == 0)
            {
                if (row.Count > 0)
                {
                    if (rows.Count >= 64) throw new FormatException("TheDraw glyph exceeds 64 rows.");
                    rows.Add(row.ToArray());
                }
                return rows.ToArray();
            }
            if (code == 13)
            {
                rows.Add(row.ToArray());
                row.Clear();
                if (rows.Count > 64) throw new FormatException("TheDraw glyph exceeds 64 rows.");
                continue;
            }
            var attribute = 7;
            if (type == 2)
            {
                if (++position >= data.Length) throw new FormatException("TheDraw color attribute is truncated.");
                attribute = data[position];
            }
            if (type == 0) code = OutlineCode(code);
            row.Add(new AsciiCell(new Rune(ThedrawCharacters.CodePoints[code]), Palette[attribute & 15],
                type == 2 ? Palette[(attribute >> 4) & 7] : null));
            if (row.Count > 256) throw new FormatException("TheDraw glyph exceeds 256 columns.");
        }
        throw new FormatException("TheDraw glyph has no terminator.");
    }

    private static byte OutlineCode(byte code) => code switch
    {
        65 => 205,
        66 => 196,
        67 => 179,
        68 => 186,
        69 => 213,
        70 => 187,
        71 => 214,
        72 => 191,
        73 => 200,
        74 => 190,
        75 => 192,
        76 => 189,
        77 => 181,
        78 => 199,
        79 or 64 or 38 => 32,
        _ => code
    };
}

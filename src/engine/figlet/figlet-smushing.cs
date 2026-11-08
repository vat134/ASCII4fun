using System.Text;

namespace Ascii4Fun.Figlet;

internal static class FigletSmushing
{
    internal static Rune? Merge(Rune left, Rune right, Figfont font)
    {
        if ((font.Layout & 128) == 0)
            return null;
        var rules = font.Layout & 63;
        if (rules == 0)
            return left == font.Hardblank ? right : right == font.Hardblank ? left
                : font.RightToLeft ? left : right;
        if (left == font.Hardblank || right == font.Hardblank)
            return (rules & 32) != 0 && left == right ? left : null;
        if ((rules & 1) != 0 && left == right)
            return left;
        if ((rules & 2) != 0)
        {
            if (left.Value == '_' && Hierarchy(right) >= 0)
                return right;
            if (right.Value == '_' && Hierarchy(left) >= 0)
                return left;
        }
        if ((rules & 4) != 0 && Hierarchy(left) >= 0 && Hierarchy(right) >= 0 && Hierarchy(left) != Hierarchy(right))
            return Hierarchy(left) > Hierarchy(right) ? left : right;
        var pair = left.ToString() + right;
        if ((rules & 8) != 0 && pair is "[]" or "][" or "{}" or "}{" or "()" or ")(")
            return new Rune('|');
        if ((rules & 16) != 0)
            return pair switch
            {
                "/\\" => new Rune('|'),
                "\\/" => new Rune('Y'),
                "><" => new Rune('X'),
                _ => null
            };
        return null;
    }

    private static int Hierarchy(Rune glyph) => glyph.Value switch
    {
        '|' => 0,
        '/' or '\\' => 1,
        '[' or ']' => 2,
        '{' or '}' => 3,
        '(' or ')' => 4,
        '<' or '>' => 5,
        _ => -1
    };
}

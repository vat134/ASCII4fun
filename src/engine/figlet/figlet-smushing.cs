using System.Text;

namespace Ascii4Fun.Figlet;

internal static class FigletSmushing
{
    internal const int HorizontalFitting = 64;
    internal const int HorizontalSmushing = 128;
    internal const int HorizontalRules = 63;
    private const int EqualCharacterRule = 1;
    private const int UnderscoreRule = 2;
    private const int HierarchyRule = 4;
    private const int OppositePairRule = 8;
    private const int BigXRule = 16;
    private const int HardblankRule = 32;

    internal static Rune? Merge(Rune left, Rune right, Figfont font)
    {
        if ((font.Layout & HorizontalSmushing) == 0)
            return null;
        var rules = font.Layout & HorizontalRules;
        if (rules == 0)
            return left == font.Hardblank ? right : right == font.Hardblank ? left
                : font.RightToLeft ? left : right;
        if (left == font.Hardblank || right == font.Hardblank)
            return (rules & HardblankRule) != 0 && left == right ? left : null;
        if ((rules & EqualCharacterRule) != 0 && left == right)
            return left;
        if ((rules & UnderscoreRule) != 0)
        {
            if (left.Value == '_' && Hierarchy(right) >= 0)
                return right;
            if (right.Value == '_' && Hierarchy(left) >= 0)
                return left;
        }
        if ((rules & HierarchyRule) != 0 && Hierarchy(left) >= 0 && Hierarchy(right) >= 0 && Hierarchy(left) != Hierarchy(right))
            return Hierarchy(left) > Hierarchy(right) ? left : right;
        var pair = left.ToString() + right;
        if ((rules & OppositePairRule) != 0 && pair is "[]" or "][" or "{}" or "}{" or "()" or ")(")
            return new Rune('|');
        if ((rules & BigXRule) != 0)
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

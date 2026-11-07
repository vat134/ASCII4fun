using System.Text;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Images;

/// <summary> Controls character-based conversion of a still image. </summary>
public sealed class CharacterImageOptions
{
    private const int MinimumOutputWidthInCells = 1;
    private const int MinimumCharacterRampLength = 2;
    private const int MaximumOutputWidthInCells = 500;

    /// <summary> The default output width measured in character cells. </summary>
    public static int DefaultOutputWidthInCells { get; } = 80;

    /// <summary> The smallest supported output width, in character cells. </summary>
    public static int MinOutputWidthInCells => MinimumOutputWidthInCells;

    /// <summary> The largest supported output width, in character cells. </summary>
    public static int MaxOutputWidthInCells => MaximumOutputWidthInCells;

    /// <summary> The cell width-to-height ratio used by the current character renderer. </summary>
    public static double DefaultCharacterCellAspectRatio => CharacterCellGeometry.AspectRatio;

    /// <summary> The default ramp ordered from darkest to lightest. </summary>
    public static string DefaultCharacterRamp { get; } = "@%#*+=-:. ";

    /// <summary> The requested output width measured in character cells. </summary>
    public int OutputWidthInCells { get; init; } = DefaultOutputWidthInCells;

    /// <summary> The glyph ramp ordered from darkest to lightest. </summary>
    public string CharacterRamp { get; init; } = DefaultCharacterRamp;

    /// <summary> Reverses light and dark glyph mapping. </summary>
    public bool Invert { get; init; }

    /// <summary> Uses sampled source colors, composited over white like luminance analysis. </summary>
    /// <remarks>Defaults to monochrome; enabling color preserves glyph selection and geometry.</remarks>
    public bool SourceColors { get; init; }

    internal Rune[] ValidateAndGetRamp()
    {
        if (OutputWidthInCells is < MinimumOutputWidthInCells or > MaximumOutputWidthInCells)
        {
            throw new ArgumentOutOfRangeException(
                nameof(OutputWidthInCells),
                OutputWidthInCells,
                $"Output width must be between {MinimumOutputWidthInCells} and {MaximumOutputWidthInCells} cells.");
        }

        if (string.IsNullOrEmpty(CharacterRamp))
        {
            throw new ArgumentException("The character ramp cannot be empty.", nameof(CharacterRamp));
        }

        var ramp = CharacterRamp.EnumerateRunes().ToArray();

        if (ramp.Length < MinimumCharacterRampLength)
        {
            throw new ArgumentException(
                $"The character ramp must contain at least {MinimumCharacterRampLength} glyphs.",
                nameof(CharacterRamp));
        }

        if (ramp.Any(Rune.IsControl))
        {
            throw new ArgumentException("The character ramp cannot contain control characters.", nameof(CharacterRamp));
        }

        return ramp;
    }
}

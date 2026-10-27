using System.Text;

namespace Ascii4Fun.Images;

/// <summary>
/// Controls character-based conversion of a still image.
/// </summary>
public sealed class CharacterImageOptions
{
    private const int MinimumOutputWidthInCells = 1;
    private const int MinimumCharacterRampLength = 2;
    private const int MaximumOutputWidthInCells = 500;
    internal const double CharacterCellAspectRatio = 0.5;

    /// <summary>
    /// Gets the default output width measured in character cells.
    /// </summary>
    public static int DefaultOutputWidthInCells { get; } = 80;

    /// <summary>
    /// Gets the default ramp ordered from darkest to lightest.
    /// </summary>
    public static string DefaultCharacterRamp { get; } = "@%#*+=-:. ";

    /// <summary>
    /// Gets the requested output width measured in character cells.
    /// </summary>
    public int OutputWidthInCells { get; init; } = DefaultOutputWidthInCells;

    /// <summary>
    /// Gets the glyph ramp ordered from darkest to lightest.
    /// </summary>
    public string CharacterRamp { get; init; } = DefaultCharacterRamp;

    /// <summary>
    /// Gets a value indicating whether light and dark glyph mapping is reversed.
    /// </summary>
    public bool Invert { get; init; }

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

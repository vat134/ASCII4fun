using System.Text;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Images;

/// <summary> Controls character-based conversion of a still image. </summary>
public sealed class CharacterImageOptions
{
    private const int MinimumOutputWidthInCells = 1;
    private const int MinimumCharacterRampLength = 2;
    private const int MaximumOutputWidthInCells = 500;

    /// <summary> The lower bound for contrast and brightness adjustments. </summary>
    public const int MinToneAdjustment = -100;

    /// <summary> The upper bound for contrast and brightness adjustments. </summary>
    public const int MaxToneAdjustment = 100;

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

    /// <summary> Default opaque white ink for monochrome output. </summary>
    public static RgbColor DefaultMonochromeColor { get; } = new(255, 255, 255);

    /// <summary> Default opaque black canvas background. </summary>
    public static RgbColor DefaultBackgroundColor { get; } = new(0, 0, 0);

    /// <summary> The requested output width measured in character cells. </summary>
    public int OutputWidthInCells { get; init; } = DefaultOutputWidthInCells;

    /// <summary> The glyph ramp ordered from darkest to lightest. </summary>
    public string CharacterRamp { get; init; } = DefaultCharacterRamp;

    /// <summary> Reverses light and dark glyph mapping. </summary>
    public bool Invert { get; init; }

    /// <summary> Uses sampled source colors, composited over white like luminance analysis. </summary>
    /// <remarks>Defaults to monochrome; enabling color preserves glyph selection and geometry.</remarks>
    public bool SourceColors { get; init; }

    /// <summary> Contrast around the midpoint; -100 flattens, 0 preserves, +100 increases contrast. </summary>
    public int Contrast { get; init; }

    /// <summary> Additive brightness in percentage points; 0 preserves the input. </summary>
    public int Brightness { get; init; }

    /// <summary> Fixed ink used when source colors are disabled. </summary>
    public RgbColor MonochromeColor { get; init; } = DefaultMonochromeColor;

    /// <summary> Opaque background retained by the result and shared raster exporter. </summary>
    public RgbColor BackgroundColor { get; init; } = DefaultBackgroundColor;

    internal Rune[] ValidateAndGetRamp()
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(Contrast, MinToneAdjustment);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(Contrast, MaxToneAdjustment);
        ArgumentOutOfRangeException.ThrowIfLessThan(Brightness, MinToneAdjustment);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(Brightness, MaxToneAdjustment);
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

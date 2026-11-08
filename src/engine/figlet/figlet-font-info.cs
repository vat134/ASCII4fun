namespace Ascii4Fun.Figlet;

/// <summary>A bundled FIGfont available to the shared text converter.</summary>
/// <param name="Id">The stable identifier passed to <see cref="FigletConverter.Convert"/>.</param>
/// <param name="Name">The font's display name.</param>
/// <param name="Category">The display category for font browsing and filtering.</param>
/// <param name="HasNativeColors">Whether the default artwork carries authored foreground and background colors.</param>
/// <param name="Note">Font-specific coverage or display guidance.</param>
public sealed record FigletFontInfo(string Id, string Name, string Category, bool HasNativeColors = false, string? Note = null);

namespace Ascii4Fun.Server.Figlet;

internal sealed record TextConversionRequest(
    string? Text,
    string FontId = "standard",
    string Format = "json",
    string? ForegroundColor = null,
    Dictionary<string, string>? ColorReplacements = null);

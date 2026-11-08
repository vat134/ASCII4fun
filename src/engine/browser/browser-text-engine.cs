using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using Ascii4Fun.Figlet;
using Ascii4Fun.Images;

namespace Ascii4Fun.Browser;

internal static partial class BrowserConversionEngine
{
    [JSExport]
    public static string TextFonts() => JsonSerializer.Serialize(FigletConverter.Fonts.ToArray(), BrowserTextJson.Default.FigletFontInfoArray);

    [JSExport]
    public static string TextFontPalette(string fontId) => JsonSerializer.Serialize(
        FigletConverter.GetFontPalette(fontId).Select(color => color.ToHex()).ToArray(), BrowserTextJson.Default.StringArray);

    [JSExport]
    public static string ConvertText(string text, string fontId, string foregroundColor, string colorReplacements)
    {
        var replacements = JsonSerializer.Deserialize(colorReplacements, BrowserTextJson.Default.DictionaryStringString)
            ?? throw new ArgumentException("Color replacements must be an object.", nameof(colorReplacements));
        current = FigletConverter.Convert(text, fontId, foregroundColor.Length == 0 ? null : RgbColor.ParseHex(foregroundColor),
            colorReplacements: replacements.ToDictionary(pair => RgbColor.ParseHex(pair.Key), pair => RgbColor.ParseHex(pair.Value)));
        return JsonSerializer.Serialize(new BrowserCanvasResult(current.Text, current.WidthInCells, current.HeightInCells),
            BrowserJson.Default.BrowserCanvasResult);
    }
}

[JsonSerializable(typeof(FigletFontInfo[]))]
[JsonSerializable(typeof(string[]))]
[JsonSerializable(typeof(Dictionary<string, string>))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
internal sealed partial class BrowserTextJson : JsonSerializerContext;

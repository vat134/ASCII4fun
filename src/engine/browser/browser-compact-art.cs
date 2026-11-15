using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using System.Text.Json.Serialization;
using Ascii4Fun.Compact;
using Ascii4Fun.Media;

namespace Ascii4Fun.Browser;

[SupportedOSPlatform("browser")]
internal static partial class BrowserConversionEngine
{
    [JSExport]
    public static void ValidateCompactSource(byte[] bytes)
    {
        ValidateSource(bytes);
        StillImageSignature.Validate(bytes);
    }

    [JSExport]
    public static string CompactLayout(int sourceWidth, int sourceHeight, string optionsJson) =>
        JsonSerializer.Serialize(CompactArtGeometry.Plan(sourceWidth, sourceHeight, CompactOptions(optionsJson)), CompactJson.Default.CompactArtLayout);

    [JSExport]
    public static string ConvertCompact(byte[] rgba, int sourceWidth, int sourceHeight, string optionsJson)
    {
        var options = CompactOptions(optionsJson);
        current = null;
        current = CompactArtPipeline.ConvertSource(new RgbaGrid(sourceWidth, sourceHeight, rgba), options);
        return CompactResult(options);
    }

    private static string CompactResult(CompactArtOptions options)
    {
        var payload = CompactDestinations.Format(current!.Text, current.WidthInCells, current.HeightInCells, options.Destination);
        var destinationCounts = CompactDestinations.All.ToDictionary(destination => destination.Id,
            destination => CompactDestinations.Count(current.WidthInCells, current.HeightInCells, destination));
        return JsonSerializer.Serialize(new BrowserCompactResult(current.Text, current.WidthInCells, current.HeightInCells, payload, destinationCounts), CompactJson.Default.BrowserCompactResult);
    }

    private static CompactArtOptions CompactOptions(string json) =>
        JsonSerializer.Deserialize(json, CompactJson.Default.CompactArtOptions)
        ?? throw new ArgumentException("Mini-art settings are required.", nameof(json));
}

internal sealed record BrowserCompactResult(string Text, int WidthInCells, int HeightInCells, CompactArtPayload Payload,
    Dictionary<string, int> DestinationCounts);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(CompactArtOptions))]
[JsonSerializable(typeof(CompactArtLayout))]
[JsonSerializable(typeof(BrowserCompactResult))]
internal sealed partial class CompactJson : JsonSerializerContext;

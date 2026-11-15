using System.Text.Json;
using System.Text.Json.Serialization;
using Ascii4Fun.Compact;
using Ascii4Fun.Rendering;
using Ascii4Fun.Server.Images;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace Ascii4Fun.Server.Compact;

internal sealed record CompactConfiguration(CompactArtOptions DefaultOptions, IReadOnlyList<CompactDestination> Destinations);
internal sealed record CompactConversionResponse(string Text, int WidthInCells, int HeightInCells, byte[] Png, CompactArtPayload Payload);

internal static class CompactConversionEndpoints
{
    private static readonly JsonSerializerOptions SettingsJson = new(JsonSerializerDefaults.Web)
    { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow };

    public static void MapCompactConversion(this WebApplication app)
    {
        app.MapGet("/api/compact/options", () => TypedResults.Ok(new CompactConfiguration(new CompactArtOptions(), CompactDestinations.All)))
            .WithName("GetCompactOptions");
        app.MapPost("/api/compact/convert", ConvertAsync).WithName("ConvertCompact")
            .Produces<CompactConversionResponse>()
            .RequireRateLimiting(ImageConversionEndpoints.PolicyName)
            .WithRequestTimeout(ImageConversionEndpoints.PolicyName);
    }

    private static async Task<IResult> ConvertAsync(IFormFile image, [FromForm] string settings,
        CompactArtConverter converter, HttpContext context, CancellationToken cancellationToken)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (image.Length == 0 || image.Length > converter.MaxEncodedBytes)
            return Results.Problem(statusCode: 400, title: "Invalid photo size", detail: $"Choose a non-empty photo up to {converter.MaxEncodedBytes} bytes.");
        if (!MediaTypeHeaderValue.TryParse(image.ContentType, out var contentType)
            || contentType.MediaType.Value?.ToLowerInvariant() is not ("image/jpeg" or "image/png" or "image/webp" or "application/octet-stream"))
            return Results.Problem(statusCode: 415, title: "Unsupported photo type", detail: "Mini art accepts JPEG, PNG or still WebP.");
        try
        {
            var options = JsonSerializer.Deserialize<CompactArtOptions>(settings, SettingsJson)
                ?? throw new ArgumentException("Mini-art settings are required.", nameof(settings));
            await using var input = image.OpenReadStream();
            var result = await converter.ConvertAsync(input, options, cancellationToken);
            var png = await PngExporter.ExportAsync(result.Canvas, cancellationToken);
            return Results.Ok(new CompactConversionResponse(result.Canvas.Text, result.Canvas.WidthInCells,
                result.Canvas.HeightInCells, png, result.Payload));
        }
        catch (JsonException)
        {
            return Results.Problem(statusCode: 400, title: "Invalid mini-art settings", detail: "Send a JSON object with supported mini-art settings.");
        }
        catch (ArgumentException exception)
        {
            return Results.Problem(statusCode: 400, title: "Invalid mini-art settings", detail: exception.Message);
        }
        catch (InvalidDataException exception)
        {
            return Results.Problem(statusCode: 422, title: "Photo cannot be converted", detail: exception.Message);
        }
    }
}

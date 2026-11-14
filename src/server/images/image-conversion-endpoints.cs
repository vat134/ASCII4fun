using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace Ascii4Fun.Server.Images;

internal static class ImageConversionEndpoints
{
    internal const string PolicyName = "image-conversion";
    internal const string AntiforgeryHeaderName = "X-CSRF-TOKEN";
    private const int MinEditorWidthInCells = 16;
    private const int MaxEditorWidthInCells = 180;
    private const int MaxEditorToneAdjustment = 40;

    public static void MapImageConversion(this WebApplication app)
    {
        app.MapGet("/api/images/options", (
            HttpContext context,
            IAntiforgery antiforgery,
            StillImageConverter converter) =>
        {
            return TypedResults.Ok(new ImageConfiguration(
                CharacterImageOptions.DefaultOutputWidthInCells,
                Math.Max(MinEditorWidthInCells, CharacterImageOptions.MinOutputWidthInCells),
                Math.Min(MaxEditorWidthInCells, CharacterImageOptions.MaxOutputWidthInCells),
                CharacterImageOptions.DefaultCharacterRamp,
                CharacterImageOptions.DefaultCharacterCellAspectRatio,
                converter.MaxEncodedBytes,
                Math.Max(-MaxEditorToneAdjustment, CharacterImageOptions.MinToneAdjustment),
                Math.Min(MaxEditorToneAdjustment, CharacterImageOptions.MaxToneAdjustment),
                CharacterImageOptions.DefaultMonochromeColor,
                CharacterImageOptions.DefaultBackgroundColor,
                CharacterImageOptions.MaxPercentage,
                antiforgery.GetAndStoreTokens(context).RequestToken!));
        }).WithName("GetImageOptions");

        app.MapPost("/api/images/convert", ConvertAsync)
            .WithName("ConvertImage")
            .Produces<ImageConversionResponse>()
            .RequireRateLimiting(PolicyName)
            .WithRequestTimeout(PolicyName);
    }

    private static async Task<IResult> ConvertAsync(
        IFormFile image,
        [FromForm] int outputWidthInCells,
        [FromForm] string characterRamp,
        [FromForm] bool invert,
        StillImageConverter converter,
        HttpContext context,
        CancellationToken cancellationToken,
        [FromForm] bool sourceColors = false,
        [FromForm] int contrast = 0,
        [FromForm] int brightness = 0,
        [FromForm] string? monochromeColor = null,
        [FromForm] string? backgroundColor = null,
        [FromForm] int shadowLift = 0,
        [FromForm] int sourcePhotoOpacity = 0,
        [FromForm] bool useMeasuredGlyphDensity = false)
    {
        context.Response.Headers.CacheControl = "no-store";

        if (image.Length == 0 || image.Length > converter.MaxEncodedBytes)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid image size",
                detail: $"Choose a non-empty image up to {converter.MaxEncodedBytes} bytes.");
        }

        if (!MediaTypeHeaderValue.TryParse(image.ContentType, out var mediaType)
            || mediaType.MediaType.Value?.ToLowerInvariant() is not ("image/jpeg" or "image/png" or "image/webp" or "application/octet-stream"))
        {
            return Results.Problem(
                statusCode: StatusCodes.Status415UnsupportedMediaType,
                title: "Unsupported upload type",
                detail: "Choose JPEG, PNG, or still WebP. File content is verified during conversion.");
        }

        try
        {
            var options = new CharacterImageOptions
            {
                OutputWidthInCells = outputWidthInCells,
                CharacterRamp = characterRamp,
                Invert = invert,
                SourceColors = sourceColors,
                Contrast = contrast,
                Brightness = brightness,
                ShadowLift = shadowLift,
                SourcePhotoOpacity = sourcePhotoOpacity,
                UseMeasuredGlyphDensity = useMeasuredGlyphDensity,
                MonochromeColor = monochromeColor is null ? CharacterImageOptions.DefaultMonochromeColor : RgbColor.ParseHex(monochromeColor),
                BackgroundColor = backgroundColor is null ? CharacterImageOptions.DefaultBackgroundColor : RgbColor.ParseHex(backgroundColor)
            };
            await using var input = image.OpenReadStream();
            var result = await converter.ConvertAsync(input, options, cancellationToken);
            var png = await PngExporter.ExportAsync(result, cancellationToken);
            return Results.Ok(new ImageConversionResponse(result.Text, result.WidthInCells, result.HeightInCells, png));
        }
        catch (ArgumentException exception)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid conversion settings",
                detail: exception.Message);
        }
        catch (InvalidDataException exception)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status422UnprocessableEntity,
                title: "Image cannot be converted",
                detail: exception.Message);
        }
    }
}

using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;

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
            return Results.Ok(new
            {
                CharacterImageOptions.DefaultOutputWidthInCells,
                DefaultStyle = CharacterImageOptions.DefaultStyle.ToString().ToLowerInvariant(),
                MinOutputWidthInCells = Math.Max(MinEditorWidthInCells, CharacterImageOptions.MinOutputWidthInCells),
                MaxOutputWidthInCells = Math.Min(MaxEditorWidthInCells, CharacterImageOptions.MaxOutputWidthInCells),
                CharacterImageOptions.DefaultCharacterRamp,
                CharacterImageOptions.DefaultCharacterCellAspectRatio,
                converter.MaxEncodedBytes,
                MinToneAdjustment = Math.Max(-MaxEditorToneAdjustment, CharacterImageOptions.MinToneAdjustment),
                MaxToneAdjustment = Math.Min(MaxEditorToneAdjustment, CharacterImageOptions.MaxToneAdjustment),
                CharacterImageOptions.DefaultMonochromeColor,
                CharacterImageOptions.DefaultBackgroundColor,
                CharacterImageOptions.MaxPercentage,
                RequestToken = antiforgery.GetAndStoreTokens(context).RequestToken
            });
        });

        app.MapPost("/api/images/convert", ConvertAsync)
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
        [FromForm] string? style = null)
    {
        context.Response.Headers.CacheControl = "no-store";

        if (image.Length == 0 || image.Length > converter.MaxEncodedBytes)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid image size",
                detail: $"Choose a non-empty image up to {converter.MaxEncodedBytes} bytes.");
        }

        if (image.ContentType is not ("image/jpeg" or "image/png" or "image/webp" or "application/octet-stream"))
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
                Style = style is null ? CharacterImageOptions.DefaultStyle : Enum.Parse<ImageStyle>(style, ignoreCase: true),
                CharacterRamp = characterRamp,
                Invert = invert,
                SourceColors = sourceColors,
                Contrast = contrast,
                Brightness = brightness,
                ShadowLift = shadowLift,
                SourcePhotoOpacity = sourcePhotoOpacity,
                MonochromeColor = monochromeColor is null ? CharacterImageOptions.DefaultMonochromeColor : RgbColor.ParseHex(monochromeColor),
                BackgroundColor = backgroundColor is null ? CharacterImageOptions.DefaultBackgroundColor : RgbColor.ParseHex(backgroundColor)
            };
            await using var input = image.OpenReadStream();
            var result = await converter.ConvertAsync(input, options, cancellationToken);
            var png = await PngExporter.ExportAsync(result, cancellationToken);
            return Results.Ok(new { result.Text, result.WidthInCells, result.HeightInCells, Png = png });
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

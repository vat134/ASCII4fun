using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;

namespace Ascii4Fun.Server.Images;

internal static class ImageConversionEndpoints
{
    internal const string PolicyName = "image-conversion";
    internal const string AntiforgeryHeaderName = "X-CSRF-TOKEN";

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
                CharacterImageOptions.MinOutputWidthInCells,
                CharacterImageOptions.MaxOutputWidthInCells,
                CharacterImageOptions.DefaultCharacterRamp,
                CharacterImageOptions.DefaultCharacterCellAspectRatio,
                converter.MaxEncodedBytes,
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
        [FromForm] bool sourceColors = false)
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

        var options = new CharacterImageOptions
        {
            OutputWidthInCells = outputWidthInCells,
            CharacterRamp = characterRamp,
            Invert = invert,
            SourceColors = sourceColors
        };

        try
        {
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

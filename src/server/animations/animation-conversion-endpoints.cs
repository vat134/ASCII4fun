using System.Text.Json;
using Ascii4Fun.Animations;
using Ascii4Fun.Images;
using Ascii4Fun.Server.Images;
using Microsoft.AspNetCore.Mvc;

namespace Ascii4Fun.Server.Animations;

internal sealed record AnimationConversionRequest(CharacterImageOptions Options, AnimationPlaybackOptions Playback);

internal static class AnimationConversionEndpoints
{
    internal const string TimeoutPolicy = "animation-conversion";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static void MapAnimationConversion(this WebApplication app) => app.MapPost("/api/animations/convert", ConvertAsync)
        .RequireRateLimiting(ImageConversionEndpoints.PolicyName).WithRequestTimeout(TimeoutPolicy);

    private static async Task<IResult> ConvertAsync(IFormFile image, [FromForm] string settings, HttpContext context, StillImageConverter converter,
        CancellationToken cancellationToken)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (image.Length <= 0 || image.Length > converter.MaxEncodedBytes)
            return Results.Problem(statusCode: 400, title: "Invalid GIF size", detail: $"Choose a non-empty GIF up to {converter.MaxEncodedBytes:N0} bytes.");
        if (image.ContentType is not ("image/gif" or "application/octet-stream"))
            return Results.Problem(statusCode: 415, title: "Unsupported upload type", detail: "Choose a GIF file.");
        try
        {
            var request = JsonSerializer.Deserialize<AnimationConversionRequest>(settings, JsonOptions)
                ?? throw new ArgumentException("Animation settings are required.");
            ArgumentNullException.ThrowIfNull(request.Options);
            ArgumentNullException.ThrowIfNull(request.Playback);
            if (context.Request.Headers.Accept.Any(value => value?.Contains("application/x-ndjson", StringComparison.Ordinal) == true))
                return Results.Stream(stream => AnimationExportStream.WriteAsync(stream, image, request, cancellationToken), "application/x-ndjson");
            await using var input = image.OpenReadStream();
            using var animation = await GifAnimation.OpenAsync(input, cancellationToken);
            var bytes = await animation.ExportAsync(request.Options, request.Playback, cancellationToken: cancellationToken);
            return Results.File(bytes, "image/gif", "ascii-animation.gif");
        }
        catch (Exception exception) when (exception is ArgumentException or JsonException)
        {
            return Results.Problem(statusCode: 400, title: "Invalid animation settings", detail: exception.Message);
        }
        catch (InvalidDataException exception)
        {
            return Results.Problem(statusCode: 422, title: "GIF cannot be converted", detail: exception.Message);
        }
    }
}

using System.Globalization;
using System.Text.Json;
using Ascii4Fun.Server.Animations;
using Ascii4Fun.Server.Images;
using Ascii4Fun.Videos;
using Microsoft.AspNetCore.Mvc;

namespace Ascii4Fun.Server.Videos;

internal static class VideoConversionEndpoints
{
    internal const string TimeoutPolicy = "video-conversion";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static void MapVideoConversion(this WebApplication app)
    {
        app.MapPost("/api/videos/prepare", PrepareAsync)
            .RequireRateLimiting(ImageConversionEndpoints.PolicyName).WithRequestTimeout(TimeoutPolicy);
        app.MapPost("/api/videos/convert", ConvertAsync)
            .RequireRateLimiting(ImageConversionEndpoints.PolicyName).WithRequestTimeout(TimeoutPolicy);
    }

    private static async Task<IResult> PrepareAsync(IFormFile image, HttpContext context, VideoTools tools, CancellationToken token)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (ValidateUpload(image) is { } error) return error;
        try
        {
            await using var input = image.OpenReadStream();
            await using var source = await VideoClip.OpenAsync(input, tools, token);
            var bytes = await source.PrepareAsync(token);
            // Probe the actual normalized bytes: orientation and codec cadence may change the geometry/count.
            await using var prepared = await VideoClip.OpenAsync(new MemoryStream(bytes, writable: false), tools, token);
            var metadata = prepared.Metadata;
            context.Response.Headers["X-Video-Metadata"] = JsonSerializer.Serialize(metadata, JsonOptions);
            return Results.File(bytes, "video/mp4");
        }
        catch (InvalidDataException exception)
        {
            return Results.Problem(statusCode: 422, title: "Video cannot be prepared", detail: exception.Message);
        }
    }

    private static async Task<IResult> ConvertAsync(IFormFile image, [FromForm] string settings, HttpContext context,
        VideoTools tools, CancellationToken token)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (ValidateUpload(image) is { } error) return error;
        try
        {
            var request = JsonSerializer.Deserialize<AnimationConversionRequest>(settings, JsonOptions)
                ?? throw new ArgumentException("Video settings are required.");
            ArgumentNullException.ThrowIfNull(request.Options);
            ArgumentNullException.ThrowIfNull(request.Playback);
            async Task<byte[]> ExportAsync(IProgress<int> progress, CancellationToken cancellationToken)
            {
                await using var input = image.OpenReadStream();
                await using var clip = await VideoClip.OpenAsync(input, tools, cancellationToken);
                return await clip.ExportAsync(request.Options, request.Playback, progress, cancellationToken);
            }
            if (context.Request.Headers.Accept.Any(value => value?.Contains("application/x-ndjson", StringComparison.Ordinal) == true))
                return Results.Stream(stream => AnimationExportStream.WriteAsync(stream, ExportAsync, "video", token), "application/x-ndjson");
            var bytes = await ExportAsync(new NoProgress(), token);
            return Results.File(bytes, "video/mp4", "ascii-video.mp4");
        }
        catch (Exception exception) when (exception is ArgumentException or JsonException)
        {
            return Results.Problem(statusCode: 400, title: "Invalid video settings", detail: exception.Message);
        }
        catch (InvalidDataException exception)
        {
            return Results.Problem(statusCode: 422, title: "Video cannot be converted", detail: exception.Message);
        }
    }

    private static IResult? ValidateUpload(IFormFile image)
    {
        if (image.Length <= 0 || image.Length > VideoClip.MaxEncodedBytes)
            return Results.Problem(statusCode: 400, title: "Invalid video size", detail: "Choose a non-empty video up to 100 MiB.");
        if (image.ContentType is not ("video/mp4" or "video/webm" or "video/quicktime" or "application/octet-stream"))
            return Results.Problem(statusCode: 415, title: "Unsupported upload type", detail: "Choose MP4, WebM or MOV video.");
        return null;
    }

    private sealed class NoProgress : IProgress<int> { public void Report(int value) { } }
}

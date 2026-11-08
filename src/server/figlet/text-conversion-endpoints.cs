using System.Text;
using Ascii4Fun.Figlet;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using Ascii4Fun.Server.Images;

namespace Ascii4Fun.Server.Figlet;

internal static class TextConversionEndpoints
{
    public static void MapTextConversion(this WebApplication app)
    {
        app.MapGet("/api/text/fonts", () => Results.Ok(FigletConverter.Fonts));
        app.MapGet("/api/text/fonts/{fontId}/palette", (string fontId, CancellationToken cancellationToken) =>
        {
            if (!FigletConverter.Fonts.Any(font => font.Id == fontId))
                return Results.Problem(statusCode: 404, title: "Unknown text font");
            return Results.Ok(FigletConverter.GetFontPalette(fontId, cancellationToken).Select(color => color.ToHex()));
        }).RequireRateLimiting(ImageConversionEndpoints.PolicyName)
            .WithRequestTimeout(ImageConversionEndpoints.PolicyName);
        app.MapPost("/api/text/convert", ConvertAsync)
            .RequireRateLimiting(ImageConversionEndpoints.PolicyName)
            .WithRequestTimeout(ImageConversionEndpoints.PolicyName);
    }

    private static async Task<IResult> ConvertAsync(TextConversionRequest request, HttpContext context,
        CancellationToken cancellationToken)
    {
        context.Response.Headers.CacheControl = "no-store";
        try
        {
            if (request.Format is not ("json" or "txt" or "png"))
                throw new ArgumentException("Choose json, txt or png output.");
            var replacements = new Dictionary<RgbColor, RgbColor>();
            foreach (var (original, replacement) in request.ColorReplacements ?? [])
            {
                if (!replacements.TryAdd(RgbColor.ParseHex(original), RgbColor.ParseHex(replacement)))
                    throw new ArgumentException("Specify each original color only once.");
            }
            ArgumentNullException.ThrowIfNull(request.Text);
            var canvas = FigletConverter.Convert(request.Text, request.FontId,
                request.ForegroundColor is null ? null : RgbColor.ParseHex(request.ForegroundColor),
                replacements, cancellationToken);
            if (request.Format == "txt")
                return Results.Text(canvas.Text, "text/plain", Encoding.UTF8);
            var png = await PngExporter.ExportAsync(canvas, cancellationToken);
            if (request.Format == "png")
                return Results.File(png, "image/png", "ascii-text.png");
            return Results.Ok(new { canvas.Text, canvas.WidthInCells, canvas.HeightInCells, Png = png });
        }
        catch (ArgumentException exception)
        {
            return Results.Problem(statusCode: 400, title: "Invalid text conversion settings", detail: exception.Message);
        }
    }
}

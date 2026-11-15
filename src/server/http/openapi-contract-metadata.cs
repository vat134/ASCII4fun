using System.Text.Json.Nodes;
using Ascii4Fun.Server.Animations;
using Ascii4Fun.Videos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Ascii4Fun.Server.Http;

internal static class OpenApiContractMetadata
{
    public static Task TransformSchemaAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken token)
    {
        // Web JSON accepts quoted numeric input but writes numbers. Keep those two contracts distinct.
        if (context.ParameterDescription is null
            && (schema.Type & (JsonSchemaType.Integer | JsonSchemaType.Number)) != 0)
        {
            schema.Type &= ~JsonSchemaType.String;
            schema.Pattern = null;
        }
        var type = context.JsonTypeInfo.Type;
        // These concrete response models emit every property, including null/default values.
        if (context.ParameterDescription is null && schema.Properties is not null
            && (type == typeof(Images.ImageConfiguration) || type == typeof(Images.ImageConversionResponse)
                || type == typeof(Ascii4Fun.Images.RgbColor) || type == typeof(Ascii4Fun.Figlet.FigletFontInfo)
                || type == typeof(VideoMetadata)))
        {
            schema.Required ??= new HashSet<string>();
            schema.Required.UnionWith(schema.Properties.Keys);
        }
        if (context.ParameterDescription is null && schema.Properties is not null
            && (type == typeof(Compact.CompactConfiguration) || type == typeof(Compact.CompactConversionResponse)
                || type == typeof(Ascii4Fun.Compact.CompactDestination) || type == typeof(Ascii4Fun.Compact.CompactArtPayload)
                || type == typeof(Ascii4Fun.Compact.CompactArtLayout)))
        {
            schema.Required ??= new HashSet<string>();
            schema.Required.UnionWith(schema.Properties.Keys);
        }
        if (context.JsonPropertyInfo is not null) return Task.CompletedTask;
        var tag = type == typeof(ExportProgress) ? ExportProgress.EventType
            : type == typeof(ExportError) ? ExportError.EventType
            : type == typeof(GifExportComplete) ? GifExportComplete.EventType
            : type == typeof(VideoExportComplete) ? VideoExportComplete.EventType : null;
        if (tag is not null)
        {
            schema.Properties!["type"] = new OpenApiSchema { Type = JsonSchemaType.String, Enum = [JsonValue.Create(tag)] };
            schema.Required ??= new HashSet<string>();
            schema.Required.Add("type");
        }
        return Task.CompletedTask;
    }

    public static async Task TransformDocumentAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken token)
    {
        document.Info.Title = "ASCII4fun HTTP API";
        document.Info.Description = "Transient local-first conversion. Generated from C# models and endpoint metadata.";
        document.Servers = [];
        // These models cross HTTP inside a string/header or as individual NDJSON lines, not ordinary JSON bodies.
        var input = new ApiParameterDescription { Source = BindingSource.Body };
        document.AddComponent(nameof(AnimationConversionRequest), await context.GetOrCreateSchemaAsync(typeof(AnimationConversionRequest), input, token));
        document.AddComponent(nameof(Ascii4Fun.Compact.CompactArtOptions), await context.GetOrCreateSchemaAsync(typeof(Ascii4Fun.Compact.CompactArtOptions), input, token));
        document.AddComponent(nameof(Ascii4Fun.Compact.CompactArtLayout), await context.GetOrCreateSchemaAsync(typeof(Ascii4Fun.Compact.CompactArtLayout), cancellationToken: token));
        foreach (var type in new[] { typeof(VideoMetadata), typeof(ExportProgress), typeof(ExportError), typeof(GifExportComplete), typeof(VideoExportComplete), typeof(ProblemDetails) })
            document.AddComponent(type.Name, await context.GetOrCreateSchemaAsync(type, cancellationToken: token));

        foreach (var (path, item) in document.Paths)
        {
            foreach (var operation in item.Operations!.Values)
            {
                operation.Responses ??= new OpenApiResponses();
                if (path.EndsWith("/convert", StringComparison.Ordinal) || path.EndsWith("/prepare", StringComparison.Ordinal))
                {
                    foreach (var status in new[] { "400", "413", "415", "429", "500" })
                        operation.Responses.TryAdd(status, ProblemResponse(document, status));
                    if (path != "/api/text/convert") operation.Responses.TryAdd("422", ProblemResponse(document, "422"));
                    operation.Responses.TryAdd("504", new OpenApiResponse { Description = "Request timeout. The response may have no body." });
                }
                if (operation.RequestBody?.Content?.TryGetValue("multipart/form-data", out var multipart) == true)
                {
                    operation.Parameters ??= [];
                    operation.Parameters.Add(new OpenApiParameter
                    {
                        Name = Images.ImageConversionEndpoints.AntiforgeryHeaderName,
                        In = ParameterLocation.Header,
                        Required = true,
                        Schema = new OpenApiSchema { Type = JsonSchemaType.String },
                        Description = "Use requestToken from GET /api/images/options and retain that response's antiforgery cookie."
                    });
                    foreach (var field in FormFields(multipart.Schema!))
                        if (field.Key == "settings" && field.Value is OpenApiSchema schema)
                            schema.Description = path == "/api/compact/convert"
                                ? "JSON-encoded CompactArtOptions. Send this form field as a string, not a nested multipart object."
                                : "JSON-encoded AnimationConversionRequest. Send this form field as a string, not a nested multipart object.";
                }
            }
        }

        var text = Operation("/api/text/convert");
        text.Description = "The JSON request's format field selects json (default), txt or png. Accept does not select the format. No response is retained.";
        var textContent = text.Responses!["200"].Content!;
        textContent["text/plain"] = new OpenApiMediaType { Schema = new OpenApiSchema { Type = JsonSchemaType.String } };
        textContent["image/png"] = Binary();

        DescribeExport("/api/animations/convert", "image/gif", nameof(GifExportComplete));
        DescribeExport("/api/videos/convert", "video/mp4", nameof(VideoExportComplete));
        var prepare = Operation("/api/videos/prepare");
        prepare.Responses!["200"] = new OpenApiResponse
        {
            Description = "Normalized MP4. No source session is retained.",
            Content = new Dictionary<string, OpenApiMediaType> { ["video/mp4"] = Binary() },
            Headers = new Dictionary<string, IOpenApiHeader>
            {
                ["X-Video-Metadata"] = new OpenApiHeader
                {
                    Required = true,
                    Description = "JSON-encoded VideoMetadata (see components.schemas.VideoMetadata).",
                    Schema = new OpenApiSchema { Type = JsonSchemaType.String }
                }
            }
        };

        OpenApiOperation Operation(string path) => document.Paths[path].Operations!.Values.Single();
        void DescribeExport(string path, string mediaType, string complete)
        {
            var operation = Operation(path);
            operation.Description = "Send an acceptable application/x-ndjson Accept entry (q > 0) for newline-delimited event items; otherwise receive binary media. "
                + "The stream emits progress, then exactly one complete or error event. An error after headers is an event, not a new HTTP status. "
                + "Disconnect cancels request-owned work. No durable job is created.";
            operation.Responses!["200"] = new OpenApiResponse
            {
                Description = "Binary export or a stream of NDJSON event items; not a JSON array.",
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    [mediaType] = Binary(),
                    ["application/x-ndjson"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            OneOf = new[] { nameof(ExportProgress), nameof(ExportError), complete }
                                .Select(name => (IOpenApiSchema)new OpenApiSchemaReference(name, document)).ToList()
                        }
                    }
                }
            };
        }
    }

    private static OpenApiMediaType Binary() => new() { Schema = new OpenApiSchema { Type = JsonSchemaType.String, Format = "binary" } };

    private static OpenApiResponse ProblemResponse(OpenApiDocument document, string status) => new()
    {
        Description = $"HTTP {status}. Application errors use Problem Details; framework/transport failures may have an empty body.",
        Content = new Dictionary<string, OpenApiMediaType>
        {
            ["application/problem+json"] = new() { Schema = new OpenApiSchemaReference(nameof(ProblemDetails), document) }
        }
    };

    private static IEnumerable<KeyValuePair<string, IOpenApiSchema>> FormFields(IOpenApiSchema schema) =>
        (schema.Properties ?? new Dictionary<string, IOpenApiSchema>())
            .Concat((schema.AllOf ?? []).SelectMany(FormFields));
}

using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;

namespace Ascii4Fun.Server.Tests;

public sealed class HttpContractTests(WebApplicationFactory<Program> application)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task DocumentsRealWireFormatsAndEmbeddedModels()
    {
        using var client = application.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();
        var document = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.StartsWith("3.1.", document.GetProperty("openapi").GetString());
        var paths = document.GetProperty("paths");
        Assert.Equal(8, paths.EnumerateObject().Count());
        var schemas = document.GetProperty("components").GetProperty("schemas");
        Assert.Equal("byte", schemas.GetProperty("ImageConversionResponse").GetProperty("properties").GetProperty("png").GetProperty("format").GetString());
        Assert.Equal("integer", schemas.GetProperty("ImageConfiguration").GetProperty("properties").GetProperty("defaultOutputWidthInCells").GetProperty("type").GetString());
        Assert.False(schemas.GetProperty("VideoMetadata").GetProperty("properties").TryGetProperty("startTimeSeconds", out _));
        Assert.Equal("progress", schemas.GetProperty("ExportProgress").GetProperty("properties").GetProperty("type").GetProperty("enum")[0].GetString());
        Assert.Contains("type", schemas.GetProperty("ExportProgress").GetProperty("required").EnumerateArray().Select(value => value.GetString()));
        var video = paths.GetProperty("/api/videos/convert").GetProperty("post");
        var stream = video.GetProperty("responses").GetProperty("200").GetProperty("content").GetProperty("application/x-ndjson");
        Assert.Equal(3, stream.GetProperty("schema").GetProperty("oneOf").GetArrayLength());
        var header = paths.GetProperty("/api/videos/prepare").GetProperty("post").GetProperty("responses").GetProperty("200").GetProperty("headers").GetProperty("X-Video-Metadata");
        Assert.Equal("string", header.GetProperty("schema").GetProperty("type").GetString());
        Assert.True(schemas.TryGetProperty("AnimationConversionRequest", out _));
        var textContent = paths.GetProperty("/api/text/convert").GetProperty("post").GetProperty("responses").GetProperty("200").GetProperty("content");
        Assert.True(textContent.TryGetProperty("text/plain", out _));
        Assert.Equal("binary", textContent.GetProperty("image/png").GetProperty("schema").GetProperty("format").GetString());
        var settings = video.GetProperty("requestBody").GetProperty("content").GetProperty("multipart/form-data").GetProperty("schema").GetProperty("allOf")
            .EnumerateArray().Select(part => part.GetProperty("properties")).Single(part => part.TryGetProperty("settings", out _)).GetProperty("settings");
        Assert.Equal("string", settings.GetProperty("type").GetString());
        var playback = schemas.GetProperty("AnimationConversionRequest").GetProperty("properties").GetProperty("playback").GetProperty("properties");
        Assert.Contains("string", playback.GetProperty("speed").GetProperty("type").EnumerateArray().Select(value => value.GetString()));
        Assert.Contains("null", playback.GetProperty("framesPerSecond").GetProperty("type").EnumerateArray().Select(value => value.GetString()));
        Assert.Equal(3, schemas.GetProperty("RgbColor").GetProperty("required").GetArrayLength());
        var paletteResponses = paths.GetProperty("/api/text/fonts/{fontId}/palette").GetProperty("get").GetProperty("responses");
        Assert.True(paletteResponses.TryGetProperty("429", out _));
        Assert.True(paletteResponses.TryGetProperty("504", out _));
        Assert.DoesNotContain("fontId", schemas.GetProperty("TextConversionRequest").GetProperty("required").EnumerateArray().Select(value => value.GetString()));

        using var options = await client.GetAsync("/api/images/options");
        var configuration = await options.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(schemas.GetProperty("ImageConfiguration").GetProperty("properties").EnumerateObject().Select(value => value.Name).Order(),
            configuration.EnumerateObject().Select(value => value.Name).Order());
    }

    [Fact]
    public async Task DoesNotExposeDocumentInProduction()
    {
        await using var production = application.WithWebHostBuilder(builder => builder.UseEnvironment("Production"));
        using var client = production.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, response.StatusCode);
    }
}

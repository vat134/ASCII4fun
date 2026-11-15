using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ascii4Fun.Compact;
using Ascii4Fun.Rendering;
using ImageMagick;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ascii4Fun.Server.Tests;

public sealed class CompactConversionTests(WebApplicationFactory<Program> application) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task ConfigurationOffersThreeSteamFieldsAndOnePerOtherPlatform()
    {
        using var client = application.CreateClient();
        var configuration = await client.GetFromJsonAsync<JsonElement>("/api/compact/options");
        var destinations = configuration.GetProperty("destinations").EnumerateArray().ToArray();
        Assert.Equal(6, destinations.Length);
        Assert.Equal(3, destinations.Count(item => item.GetProperty("platform").GetString() == "Steam"));
        Assert.All(destinations.Where(item => item.GetProperty("platform").GetString() != "Steam")
            .GroupBy(item => item.GetProperty("platform").GetString()), group => Assert.Single(group));
        Assert.False(configuration.GetProperty("defaultOptions").TryGetProperty("blankCells", out _));
    }

    [Fact]
    public async Task ConversionMatchesHeadlessTextPayloadAndPng()
    {
        using var image = new MagickImage(MagickColors.White, 32, 24);
        using var pixels = image.GetPixels();
        for (var y = 0; y < 24; y++) for (var x = 0; x < 16; x++) pixels.SetPixel(x, y, [0, 0, 0]);
        var encoded = image.ToByteArray(MagickFormat.Png);
        var options = new CompactArtOptions { Destination = "twitch", Columns = 16, CropZoom = 1.5, QuarterTurns = 1 };
        var expected = await new CompactArtConverter().ConvertAsync(new MemoryStream(encoded), options);
        using var client = await ClientAsync();
        using var body = Body(encoded, JsonSerializer.Serialize(options));
        using var response = await client.PostAsync("/api/compact/convert", body);
        response.EnsureSuccessStatusCode();
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(expected.Canvas.Text, result.GetProperty("text").GetString());
        Assert.Equal(expected.Payload.Text, result.GetProperty("payload").GetProperty("text").GetString());
        Assert.Equal(await PngExporter.ExportAsync(expected.Canvas), result.GetProperty("png").GetBytesFromBase64());
    }

    [Theory]
    [InlineData("{", HttpStatusCode.BadRequest)]
    [InlineData("{\"gamma\":0}", HttpStatusCode.BadRequest)]
    [InlineData("{\"destination\":\"unknown\"}", HttpStatusCode.BadRequest)]
    [InlineData("null", HttpStatusCode.BadRequest)]
    public async Task InvalidSettingsReturnStableProblems(string settings, HttpStatusCode status)
    {
        using var image = new MagickImage(MagickColors.White, 4, 4);
        using var client = await ClientAsync();
        using var body = Body(image.ToByteArray(MagickFormat.Png), settings);
        using var response = await client.PostAsync("/api/compact/convert", body);
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task InvalidSourceAndUnsupportedMediaTypeAreRejected()
    {
        using var client = await ClientAsync();
        using var invalid = Body("broken"u8.ToArray(), "{}");
        using var response = await client.PostAsync("/api/compact/convert", invalid);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        using var gif = Body("GIF89a"u8.ToArray(), "{}", "image/gif");
        using var unsupported = await client.PostAsync("/api/compact/convert", gif);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, unsupported.StatusCode);
    }

    private async Task<HttpClient> ClientAsync()
    {
        var client = application.CreateClient();
        var config = await client.GetFromJsonAsync<JsonElement>("/api/images/options");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", config.GetProperty("requestToken").GetString());
        return client;
    }

    private static MultipartFormDataContent Body(byte[] bytes, string settings, string type = "image/png")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = MediaTypeHeaderValue.Parse(type);
        return new MultipartFormDataContent { { file, "image", "source.png" }, { new StringContent(settings), "settings" } };
    }
}

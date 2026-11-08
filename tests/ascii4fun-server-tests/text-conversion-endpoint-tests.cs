using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ascii4Fun.Figlet;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ascii4Fun.Server.Tests;

public sealed class TextConversionEndpointTests(WebApplicationFactory<Program> application)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task ListsEngineFontsAndWholeFontPalette()
    {
        using var client = application.CreateClient();
        var fonts = await client.GetFromJsonAsync<FigletFontInfo[]>("/api/text/fonts");
        Assert.Equal(FigletConverter.Fonts, fonts);
        var palette = await client.GetFromJsonAsync<string[]>("/api/text/fonts/tdf-colorrounded/palette");
        Assert.Equal(FigletConverter.GetFontPalette("tdf-colorrounded").Select(color => color.ToHex()), palette);
        using var missing = await client.GetAsync("/api/text/fonts/missing/palette");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Theory]
    [InlineData("standard", "json")]
    [InlineData("small-braille", "txt")]
    [InlineData("tdf-colorrounded", "png")]
    public async Task ReturnsExactEngineRepresentations(string fontId, string format)
    {
        using var client = application.CreateClient();
        var replacements = new Dictionary<string, string> { ["#FFFFFF"] = "#00FFAA" };
        var expected = FigletConverter.Convert("ASCII\nText", fontId,
            colorReplacements: new Dictionary<RgbColor, RgbColor> { [new(255, 255, 255)] = new(0, 255, 170) });
        using var response = await client.PostAsJsonAsync("/api/text/convert", new
        {
            text = "ASCII\r\nText",
            fontId,
            format,
            colorReplacements = replacements
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        if (format == "txt")
        {
            Assert.Equal("text/plain", response.Content.Headers.ContentType!.MediaType);
            Assert.Equal(expected.Text, await response.Content.ReadAsStringAsync());
        }
        else if (format == "png")
        {
            Assert.Equal("image/png", response.Content.Headers.ContentType!.MediaType);
            Assert.Equal(await PngExporter.ExportAsync(expected), await response.Content.ReadAsByteArrayAsync());
        }
        else
        {
            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(expected.Text, json.GetProperty("text").GetString());
            Assert.Equal(expected.WidthInCells, json.GetProperty("widthInCells").GetInt32());
            Assert.Equal(expected.HeightInCells, json.GetProperty("heightInCells").GetInt32());
            Assert.Equal(await PngExporter.ExportAsync(expected), json.GetProperty("png").GetBytesFromBase64());
        }
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"text\":null,\"fontId\":\"standard\"}")]
    [InlineData("{\"text\":\"\",\"fontId\":\"standard\"}")]
    [InlineData("{\"text\":\"A\",\"fontId\":\"missing\"}")]
    [InlineData("{\"text\":\"A\",\"fontId\":\"standard\",\"format\":\"pdf\"}")]
    [InlineData("{\"text\":\"A\",\"fontId\":\"standard\",\"foregroundColor\":\"red\"}")]
    [InlineData("{\"text\":\"A\",\"fontId\":\"standard\",\"foregroundColor\":\"#FFFFFF\",\"colorReplacements\":{\"#FFFFFF\":\"#000000\"}}")]
    [InlineData("{\"text\":\"A\",\"fontId\":\"standard\",\"colorReplacements\":{\"red\":\"#000000\"}}")]
    [InlineData("{\"text\":\"A\",\"fontId\":\"standard\",\"colorReplacements\":{\"#FFFFFF\":\"#000000\",\"#ffffff\":\"#00FF00\"}}")]
    [InlineData("{\"text\":\"A\",\"fontId\":null}")]
    [InlineData("{\"text\":42}")]
    [InlineData("{\"text\":\"\\t\"}")]
    [InlineData("{")]
    public async Task RejectsInvalidRequests(string json)
    {
        using var client = application.CreateClient();
        using var body = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        using var response = await client.PostAsync("/api/text/convert", body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task RejectsExcessiveAndUnsupportedInput()
    {
        using var client = application.CreateClient();
        using var excessive = await client.PostAsJsonAsync("/api/text/convert", new { text = new string('A', 257), fontId = "standard" });
        Assert.Equal(HttpStatusCode.BadRequest, excessive.StatusCode);
        using var body = new StringContent("hello");
        using var unsupported = await client.PostAsync("/api/text/convert", body);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, unsupported.StatusCode);
    }
}

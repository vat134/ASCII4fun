using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;
using ImageMagick;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ascii4Fun.Server.Tests;

public sealed class ImageConversionEndpointTests(WebApplicationFactory<Program> application)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ReturnsPackagePngAndGlyphOnlyText(bool sourceColors)
    {
        using var client = application.CreateClient();
        await GetConfigurationAsync(client);
        using var image = new MagickImage(MagickColors.Red, 4, 2);
        var encoded = image.ToByteArray(MagickFormat.Png);
        using var input = new MemoryStream(encoded);
        var expected = await new StillImageConverter().ConvertAsync(input, new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@ ",
            Invert = true,
            SourceColors = sourceColors
        });
        using var body = CreateBody(encoded, "image/png");
        body.Add(new StringContent(sourceColors.ToString()), "sourceColors");
        using var response = await client.PostAsync("/api/images/convert", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(expected.Text, result.GetProperty("text").GetString());
        using var actualPng = new MagickImage(Convert.FromBase64String(result.GetProperty("png").GetString()!));
        using var expectedPng = new MagickImage(await PngExporter.ExportAsync(expected));
        using var actualPixels = actualPng.GetPixels();
        using var expectedPixels = expectedPng.GetPixels();
        Assert.Equal(expectedPixels.ToByteArray(PixelMapping.RGB), actualPixels.ToByteArray(PixelMapping.RGB));
        Assert.True(response.Headers.CacheControl!.NoStore);
    }

    [Fact]
    public async Task RejectsInvalidColorFlagAndPreservesPreviouslyValidTallGrids()
    {
        using var client = application.CreateClient();
        await GetConfigurationAsync(client);
        using var invalid = CreateBody(CreateImage(MagickFormat.Png), "image/png");
        invalid.Add(new StringContent("invalid"), "sourceColors");
        using var invalidResponse = await client.PostAsync("/api/images/convert", invalid);
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);

        using var tall = new MagickImage(MagickColors.Red, 1, 2000);
        using var excessive = CreateBody(tall.ToByteArray(MagickFormat.Png), "image/png", "1");
        using var excessiveResponse = await client.PostAsync("/api/images/convert", excessive);
        Assert.Equal(HttpStatusCode.OK, excessiveResponse.StatusCode);
        var result = await excessiveResponse.Content.ReadFromJsonAsync<JsonElement>();
        using var png = new MagickImage(Convert.FromBase64String(result.GetProperty("png").GetString()!));
        Assert.Equal(12u, png.Width);
        Assert.Equal(24_000u, png.Height);
    }

    [Theory]
    [InlineData(MagickFormat.Png, "image/png")]
    [InlineData(MagickFormat.Jpeg, "image/jpeg")]
    [InlineData(MagickFormat.WebP, "image/webp")]
    public async Task UploadMatchesEngineAndCanBeRepeated(MagickFormat format, string contentType)
    {
        using var client = application.CreateClient();
        var configuration = await GetConfigurationAsync(client);
        var encoded = CreateImage(format);
        using var input = new MemoryStream(encoded);
        var expected = await new StillImageConverter().ConvertAsync(input, new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@ ",
            Invert = true
        });

        for (var attempt = 0; attempt < 2; attempt++)
        {
            using var body = CreateBody(encoded, contentType);
            using var response = await client.PostAsync("/api/images/convert", body);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var actual = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(expected.Text, actual.GetProperty("text").GetString());
            Assert.Equal(expected.WidthInCells, actual.GetProperty("widthInCells").GetInt32());
            Assert.Equal(expected.HeightInCells, actual.GetProperty("heightInCells").GetInt32());
            Assert.True(response.Headers.CacheControl!.NoStore);
        }

        Assert.Equal(new StillImageConverter().MaxEncodedBytes, configuration.GetProperty("maxEncodedBytes").GetInt64());
    }

    [Theory]
    [InlineData("0", "@ ")]
    [InlineData("501", "@ ")]
    [InlineData("4", "x")]
    [InlineData("4", "@\n ")]
    public async Task RejectsInvalidSettings(string width, string ramp)
    {
        using var client = application.CreateClient();
        await GetConfigurationAsync(client);
        using var body = CreateBody(CreateImage(MagickFormat.Png), "image/png", width, ramp);
        using var response = await client.PostAsync("/api/images/convert", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task RejectsUploadWithoutAntiforgeryToken()
    {
        using var client = application.CreateClient();
        using var body = CreateBody(CreateImage(MagickFormat.Png), "image/png");
        using var response = await client.PostAsync("/api/images/convert", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RejectsSpoofedImageAndUnsupportedContentType()
    {
        using var client = application.CreateClient();
        await GetConfigurationAsync(client);
        using var invalidImage = CreateBody("not an image"u8.ToArray(), "image/png");
        using var invalidResponse = await client.PostAsync("/api/images/convert", invalidImage);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, invalidResponse.StatusCode);

        using var unsupported = CreateBody(CreateImage(MagickFormat.Png), "image/gif");
        using var unsupportedResponse = await client.PostAsync("/api/images/convert", unsupported);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, unsupportedResponse.StatusCode);
    }

    [Fact]
    public async Task RejectsExcessiveMultipartFile()
    {
        using var client = application.CreateClient();
        var configuration = await GetConfigurationAsync(client);
        var maxBytes = configuration.GetProperty("maxEncodedBytes").GetInt32();
        using var body = CreateBody(new byte[maxBytes + 1], "image/png");
        using var response = await client.PostAsync("/api/images/convert", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static async Task<JsonElement> GetConfigurationAsync(HttpClient client)
    {
        var configuration = await client.GetFromJsonAsync<JsonElement>("/api/images/options");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", configuration.GetProperty("requestToken").GetString());
        return configuration;
    }

    private static MultipartFormDataContent CreateBody(byte[] image, string contentType, string width = "4", string ramp = "@ ")
    {
        var file = new ByteArrayContent(image);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent
        {
            { file, "image", "source.png" },
            { new StringContent(width), "outputWidthInCells" },
            { new StringContent(ramp), "characterRamp" },
            { new StringContent("true"), "invert" }
        };
    }

    private static byte[] CreateImage(MagickFormat format)
    {
        using var image = new MagickImage(MagickColors.Black, 4, 2);
        using var pixels = image.GetPixels();
        for (var y = 0; y < 2; y++)
        {
            for (var x = 2; x < 4; x++) pixels.SetPixel(x, y, [255, 255, 255]);
        }
        return image.ToByteArray(format);
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ascii4Fun.Images;
using ImageMagick;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ascii4Fun.Server.Tests;

public sealed class ImageConversionEndpointTests(WebApplicationFactory<Program> application)
    : IClassFixture<WebApplicationFactory<Program>>
{
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

using System.Net;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;
using Ascii4Fun.Animations;
using Ascii4Fun.Images;
using ImageMagick;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ascii4Fun.Server.Tests;

public sealed class AnimationConversionEndpointTests(WebApplicationFactory<Program> application) : IClassFixture<WebApplicationFactory<Program>>
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task RejectsFpsAboveTheSourceAverage(bool streamed)
    {
        using var client = application.CreateClient();
        var config = await client.GetFromJsonAsync<JsonElement>("/api/images/options");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", config.GetProperty("requestToken").GetString());
        if (streamed) client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/x-ndjson"));
        using var body = Body(Fixture(), "{\"options\":{},\"playback\":{\"framesPerSecond\":21}}");
        using var response = await client.PostAsync("/api/animations/convert", body);
        Assert.Equal(streamed ? HttpStatusCode.OK : HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("average frame rate", await response.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task RawAndStreamedGifMatchPackageTimingAndPixels(bool streamed)
    {
        using var client = application.CreateClient();
        var config = await client.GetFromJsonAsync<JsonElement>("/api/images/options");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", config.GetProperty("requestToken").GetString());
        if (streamed) client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/x-ndjson"));
        var bytes = Fixture();
        var options = new CharacterImageOptions { OutputWidthInCells = 4, SourceColors = true };
        var playback = new AnimationPlaybackOptions { Speed = 2, FramesPerSecond = 10 };
        using var source = new MemoryStream(bytes);
        using var animation = await GifAnimation.OpenAsync(source);
        var expected = await animation.ExportAsync(options, playback);
        using var body = Body(bytes, JsonSerializer.Serialize(new { options, playback }));
        using var response = await client.PostAsync("/api/animations/convert", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        if (!streamed) Assert.Equal(expected, await response.Content.ReadAsByteArrayAsync());
        else
        {
            var lines = (await response.Content.ReadAsStringAsync()).Split('\n', StringSplitOptions.RemoveEmptyEntries);
            Assert.Contains(lines, line => line.Contains("progress", StringComparison.Ordinal));
            using var completion = JsonDocument.Parse(lines[^1]);
            Assert.Equal("complete", completion.RootElement.GetProperty("type").GetString());
            Assert.Equal(expected, completion.RootElement.GetProperty("gif").GetBytesFromBase64());
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MalformedGifReturnsProblemOrStreamError(bool streamed)
    {
        using var client = application.CreateClient();
        var config = await client.GetFromJsonAsync<JsonElement>("/api/images/options");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", config.GetProperty("requestToken").GetString());
        if (streamed) client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/x-ndjson"));
        using var body = Body("GIF89a"u8.ToArray(), "{\"options\":{},\"playback\":{}}");
        using var response = await client.PostAsync("/api/animations/convert", body);
        Assert.Equal(streamed ? HttpStatusCode.OK : HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        if (streamed) Assert.Contains("\"type\":\"error\"", content, StringComparison.Ordinal);
        Assert.DoesNotContain("\"type\":\"complete\"", content, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RejectsUploadWithoutAntiforgeryToken()
    {
        using var client = application.CreateClient();
        using var body = Body(Fixture(), "{\"options\":{},\"playback\":{}}");
        using var response = await client.PostAsync("/api/animations/convert", body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("{}", "image/gif", 400)]
    [InlineData("{", "image/gif", 400)]
    [InlineData("{\"options\":{},\"playback\":{}}", "image/png", 415)]
    public async Task RejectsInvalidRequest(string settings, string contentType, int status)
    {
        using var client = application.CreateClient();
        var config = await client.GetFromJsonAsync<JsonElement>("/api/images/options");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", config.GetProperty("requestToken").GetString());
        using var body = Body(Fixture(), settings, contentType);
        using var response = await client.PostAsync("/api/animations/convert", body);
        Assert.Equal(status, (int)response.StatusCode);
    }

    private static MultipartFormDataContent Body(byte[] bytes, string settings, string contentType = "image/gif")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new MultipartFormDataContent { { file, "image", "fixture.gif" }, { new StringContent(settings), "settings" } };
    }

    private static byte[] Fixture()
    {
        using var frames = new MagickImageCollection();
        frames.Add(new MagickImage(MagickColors.Red, 4, 4) { AnimationDelay = 3, AnimationIterations = 3 });
        frames.Add(new MagickImage(MagickColors.Blue, 4, 4) { AnimationDelay = 7 });
        return frames.ToByteArray(MagickFormat.Gif);
    }
}

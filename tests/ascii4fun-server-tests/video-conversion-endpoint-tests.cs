using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Ascii4Fun.TestMedia;
using Ascii4Fun.Videos;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ascii4Fun.Server.Tests;

public sealed class VideoConversionEndpointTests(WebApplicationFactory<Program> application) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task PrepareAndExportRetainSoundAndUseSelectedTiming()
    {
        using var client = await ClientAsync();
        using var upload = Body(VideoFixture.Bytes());
        using var prepared = await client.PostAsync("/api/videos/prepare", upload);
        Assert.Equal(HttpStatusCode.OK, prepared.StatusCode);
        Assert.Equal("video/mp4", prepared.Content.Headers.ContentType!.MediaType);
        Assert.True(prepared.Headers.CacheControl!.NoStore);
        Assert.True(prepared.Headers.Contains("X-Video-Metadata"));
        using var body = Body(await prepared.Content.ReadAsByteArrayAsync(), "{\"options\":{\"outputWidthInCells\":8},\"playback\":{\"speed\":2,\"framesPerSecond\":5}}");
        using var response = await client.PostAsync("/api/videos/convert", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await using var output = await VideoClip.OpenAsync(await response.Content.ReadAsStreamAsync());
        Assert.True(output.Metadata.HasAudio);
        Assert.InRange(output.Metadata.DurationMs, 990, 1030);
        Assert.Equal(5, output.Metadata.FramesPerSecond);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ExcessiveFpsReturnsProblemOrStreamError(bool streamed)
    {
        using var client = await ClientAsync();
        if (streamed) client.DefaultRequestHeaders.Accept.Add(new("application/x-ndjson"));
        using var body = Body(VideoFixture.Bytes(), "{\"options\":{},\"playback\":{\"framesPerSecond\":11}}");
        using var response = await client.PostAsync("/api/videos/convert", body);
        Assert.Equal(streamed ? HttpStatusCode.OK : HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("average frame rate", await response.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task RejectsMalformedAndWrongTypeUploads()
    {
        using var client = await ClientAsync();
        using var invalid = Body("invalid"u8.ToArray());
        using var response = await client.PostAsync("/api/videos/prepare", invalid);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        using var wrongType = Body(VideoFixture.Bytes(), contentType: "image/png");
        using var wrongResponse = await client.PostAsync("/api/videos/prepare", wrongType);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, wrongResponse.StatusCode);
    }

    [Fact]
    public async Task RequiresAntiforgeryForVideoPreparation()
    {
        using var client = application.CreateClient();
        using var body = Body(VideoFixture.Bytes());
        using var response = await client.PostAsync("/api/videos/prepare", body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<HttpClient> ClientAsync()
    {
        var client = application.CreateClient();
        var config = await client.GetFromJsonAsync<JsonElement>("/api/images/options");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", config.GetProperty("requestToken").GetString());
        return client;
    }

    private static MultipartFormDataContent Body(byte[] bytes, string? settings = null, string contentType = "video/mp4")
    {
        var body = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        body.Add(file, "image", "clip.mp4");
        if (settings is not null) body.Add(new StringContent(settings), "settings");
        return body;
    }
}

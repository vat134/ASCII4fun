using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Ascii4Fun.Server.Tests;

public sealed class HealthEndpointTests(WebApplicationFactory<Program> application)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task GetHealthReturnsOk()
    {
        using var client = application.CreateClient();

        using var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}


using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Auth;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Auth;

public class LogoutTests
{
    [Fact]
    public async Task WithValidCookie_RevokesTokenAndClearsCookie_Returns204()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var userId = await factory.RegisterAndVerifyAsync(client, "lo@example.com");

        var login = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest("lo@example.com", AuthTestHelpers.ValidPassword));
        var cookie = login.ExtractRefreshCookieValue()!;
        factory.CountActiveTokensFor(userId).Should().Be(1);

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/logout");
        req.Headers.Add("Cookie", $"csk_rt={cookie}");
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        factory.CountActiveTokensFor(userId).Should().Be(0);

        resp.Headers.TryGetValues("Set-Cookie", out var set).Should().BeTrue();
        set!.Any(c => c.StartsWith("csk_rt=")).Should().BeTrue();
    }

    [Fact]
    public async Task WithoutCookie_StillReturns204_Idempotent()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var resp = await client.PostAsync("/api/v1/auth/logout", null);
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}

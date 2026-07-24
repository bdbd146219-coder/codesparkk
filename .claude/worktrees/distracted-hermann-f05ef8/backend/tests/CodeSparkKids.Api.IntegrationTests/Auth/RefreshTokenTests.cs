using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Auth;

public class RefreshTokenTests
{
    // No-cookie-jar client so tests can pin the EXACT cookie they send
    // (otherwise WebApplicationFactory auto-tracks Set-Cookie and overrides
    // any manual Cookie header).
    private static HttpClient NoJar(AuthTestFactory factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    [Fact]
    public async Task ValidCookie_RotatesToken_RevokesOldAndIssuesNew()
    {
        await using var factory = new AuthTestFactory();
        var client = NoJar(factory);
        var userId = await factory.RegisterAndVerifyAsync(client, "rotate@example.com");

        var login = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest("rotate@example.com", AuthTestHelpers.ValidPassword));
        var oldCookie = login.ExtractRefreshCookieValue();
        oldCookie.Should().NotBeNullOrEmpty();

        var refresh = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refresh.Headers.Add("Cookie", $"csk_rt={oldCookie}");
        var refreshResp = await client.SendAsync(refresh);
        refreshResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var newCookie = refreshResp.ExtractRefreshCookieValue();
        newCookie.Should().NotBeNullOrEmpty();
        newCookie.Should().NotBe(oldCookie);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tokens = db.RefreshTokens.Where(t => t.UserId == userId).ToList();
        tokens.Should().HaveCount(2);
        tokens.Count(t => t.RevokedAt is not null && t.RevokedReason == "rotated").Should().Be(1);
        tokens.Count(t => t.RevokedAt is null).Should().Be(1);
    }

    [Fact]
    public async Task ReuseOfRotatedToken_RevokesEntireChain_Returns401()
    {
        await using var factory = new AuthTestFactory();
        var client = NoJar(factory);
        var userId = await factory.RegisterAndVerifyAsync(client, "theft@example.com");

        var login = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest("theft@example.com", AuthTestHelpers.ValidPassword));
        var oldCookie = login.ExtractRefreshCookieValue()!;

        var firstRefresh = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        firstRefresh.Headers.Add("Cookie", $"csk_rt={oldCookie}");
        var firstResp = await client.SendAsync(firstRefresh);
        firstResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Replay the old (now-rotated) cookie → theft detection
        var replay = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        replay.Headers.Add("Cookie", $"csk_rt={oldCookie}");
        var replayResp = await client.SendAsync(replay);
        replayResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var active = await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .CountAsync();
        active.Should().Be(0, "the entire token chain must be revoked on theft detection");
        db.AuditEntries.Count(a => a.EventType == "AuthRefreshReuse").Should().Be(1);
    }

    [Fact]
    public async Task MissingCookie_Returns401()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var resp = await client.PostAsync("/api/v1/auth/refresh", null);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task InvalidCookie_Returns401()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        req.Headers.Add("Cookie", "csk_rt=nope-not-a-real-token");
        var resp = await client.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

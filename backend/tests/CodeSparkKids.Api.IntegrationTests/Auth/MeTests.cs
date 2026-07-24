using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Auth;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Auth;

public class MeTests
{
    [Fact]
    public async Task ValidBearer_Returns200_WithSafeShape()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "me@example.com");

        var (loginResp, login) = await client.LoginAsync("me@example.com");
        loginResp.EnsureSuccessStatusCode();

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login!.AccessToken);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var me = await resp.Content.ReadFromJsonAsync<AuthenticatedUserDto>();
        me.Should().NotBeNull();
        me!.Email.Should().Be("me@example.com");
        me.DisplayName.Should().Be("Sara");
        me.Roles.Should().Contain("Parent");
        me.EmailVerified.Should().BeTrue();
        me.PreferredLocale.Should().Be("en");

        var raw = await resp.Content.ReadAsStringAsync();
        raw.Should().NotContain("passwordHash");
        raw.Should().NotContain("securityStamp");
        raw.Should().NotContain("refreshToken");
    }

    [Fact]
    public async Task MissingBearer_Returns401()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var resp = await client.GetAsync("/api/v1/auth/me");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

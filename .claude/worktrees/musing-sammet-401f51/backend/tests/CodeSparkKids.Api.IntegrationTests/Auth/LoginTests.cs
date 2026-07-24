using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Auth;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Auth;

public class LoginTests
{
    [Fact]
    public async Task HappyPath_Returns200_WithAccessTokenAndCookie()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "happy@example.com");

        var (resp, body) = await client.LoginAsync("happy@example.com");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        body.Should().NotBeNull();
        body!.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.AccessTokenExpiresAt.Should().BeAfter(DateTime.UtcNow);
        body.User.Email.Should().Be("happy@example.com");
        body.User.Roles.Should().Contain("Parent");
        body.User.EmailVerified.Should().BeTrue();
        resp.ExtractRefreshCookieValue().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task UnknownEmail_Returns401_Generic()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var (resp, _) = await client.LoginAsync("nobody@example.com");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task WrongPassword_Returns401_Generic()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "wrong@example.com");

        var (resp, _) = await client.LoginAsync("wrong@example.com", "Sup3rStr0ng!WrongPass");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UnverifiedEmail_Returns403_WithEmailNotVerifiedType()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "unverified@example.com", verify: false);

        var resp = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest("unverified@example.com", AuthTestHelpers.ValidPassword));

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var problem = await resp.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        problem!.Type.Should().Contain("email-not-verified");
    }

    [Fact]
    public async Task FailedAttempts_LockAccount_Returns423()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "lockme@example.com");

        // First 4 wrong passwords return 401; the 5th hits MaxFailedAccessAttempts
        // and Identity locks the account — that attempt returns 423.
        for (int i = 0; i < 4; i++)
        {
            var bad = await client.LoginAsync("lockme@example.com", "Sup3rStr0ng!Wrong");
            bad.Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        var lockTrigger = await client.LoginAsync("lockme@example.com", "Sup3rStr0ng!Wrong");
        lockTrigger.Response.StatusCode.Should().Be((HttpStatusCode)423);
        lockTrigger.Response.Headers.TryGetValues("Retry-After", out _).Should().BeTrue();

        // And even the correct password is rejected while locked
        var correct = await client.LoginAsync("lockme@example.com", AuthTestHelpers.ValidPassword);
        correct.Response.StatusCode.Should().Be((HttpStatusCode)423);
    }

    [Fact]
    public async Task Login_DoesNotExposeSensitiveFields()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "safe@example.com");

        var resp = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest("safe@example.com", AuthTestHelpers.ValidPassword));
        var raw = await resp.Content.ReadAsStringAsync();

        raw.Should().NotContain("passwordHash", "the API must never expose Identity password hash");
        raw.Should().NotContain("securityStamp");
        raw.Should().NotContain("concurrencyStamp");
    }
}

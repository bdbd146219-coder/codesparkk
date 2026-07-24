using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Infrastructure.Identity;
using CodeSparkKids.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Auth;

public class ForgotPasswordTests
{
    [Fact]
    public async Task KnownEmail_Returns202_AndSendsResetEmail()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "fp@example.com");
        factory.Emails.Reset();

        var resp = await client.PostAsJsonAsync("/api/v1/auth/forgot-password",
            new ForgotPasswordRequest("fp@example.com"));

        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
        factory.Emails.LastReset("fp@example.com").Should().NotBeNull();
    }

    [Fact]
    public async Task UnknownEmail_Also_Returns202_AndDoesNotSendEmail()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/v1/auth/forgot-password",
            new ForgotPasswordRequest("ghost@example.com"));

        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
        factory.Emails.Records.Should().BeEmpty();
    }
}

public class ResetPasswordTests
{
    [Fact]
    public async Task ValidToken_ResetsPassword_RevokesAllRefreshTokens_Returns200()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var userId = await factory.RegisterAndVerifyAsync(client, "rp@example.com");

        // Pre-existing session
        await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest("rp@example.com", AuthTestHelpers.ValidPassword));
        factory.CountActiveTokensFor(userId).Should().Be(1);

        string resetToken;
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByIdAsync(userId.ToString());
            resetToken = await users.GeneratePasswordResetTokenAsync(user!);
        }

        var resp = await client.PostAsJsonAsync("/api/v1/auth/reset-password",
            new ResetPasswordRequest(userId, resetToken, "NewSup3rStr0ng!Pass"));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        factory.CountActiveTokensFor(userId).Should().Be(0, "reset must invalidate all sessions");

        // Old password no longer works
        var oldLogin = await client.LoginAsync("rp@example.com", AuthTestHelpers.ValidPassword);
        oldLogin.Response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // New password does
        var newLogin = await client.LoginAsync("rp@example.com", "NewSup3rStr0ng!Pass");
        newLogin.Response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task InvalidToken_Returns400_Generic()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var userId = await factory.RegisterAndVerifyAsync(client, "bad@example.com");

        var resp = await client.PostAsJsonAsync("/api/v1/auth/reset-password",
            new ResetPasswordRequest(userId, "not-a-real-token-abc", "NewSup3rStr0ng!Pass"));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}

public class VerifyEmailTests
{
    [Fact]
    public async Task ValidToken_Returns200_ConfirmsEmail()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/v1/auth/parent/register", AuthTestHelpers.ValidRegister("v@example.com"));

        Guid userId;
        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByEmailAsync("v@example.com");
            userId = user!.Id;
            token = await users.GenerateEmailConfirmationTokenAsync(user);
        }

        var resp = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new VerifyEmailRequest(userId, token));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<VerifyEmailResponse>();
        body!.Ok.Should().BeTrue();
        body.AlreadyVerified.Should().BeFalse();

        using var verifyScope = factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        verifyDb.Users.Single(u => u.Id == userId).EmailConfirmed.Should().BeTrue();
    }

    [Fact]
    public async Task AlreadyVerified_Returns200_WithFlag()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var userId = await factory.RegisterAndVerifyAsync(client, "av@example.com");

        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByIdAsync(userId.ToString());
            token = await users.GenerateEmailConfirmationTokenAsync(user!);
        }

        var resp = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new VerifyEmailRequest(userId, token));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<VerifyEmailResponse>();
        body!.AlreadyVerified.Should().BeTrue();
    }

    [Fact]
    public async Task InvalidToken_Returns400_Generic()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/v1/auth/parent/register", AuthTestHelpers.ValidRegister("vi@example.com"));

        Guid userId;
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            userId = (await users.FindByEmailAsync("vi@example.com"))!.Id;
        }

        var resp = await client.PostAsJsonAsync("/api/v1/auth/verify-email",
            new VerifyEmailRequest(userId, "not-a-real-token-XYZ123"));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}

public class ResendVerificationTests
{
    [Fact]
    public async Task UnverifiedKnownEmail_Returns202_AndQueuesEmail()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/v1/auth/parent/register", AuthTestHelpers.ValidRegister("rv@example.com"));
        factory.Emails.Reset();

        var resp = await client.PostAsJsonAsync("/api/v1/auth/resend-verification",
            new ResendVerificationRequest("rv@example.com"));

        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
        factory.Emails.LastVerification("rv@example.com").Should().NotBeNull();
    }

    [Fact]
    public async Task UnknownEmail_Returns202_ButDoesNotSend()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/v1/auth/resend-verification",
            new ResendVerificationRequest("ghost@example.com"));

        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
        factory.Emails.Records.Should().BeEmpty();
    }
}

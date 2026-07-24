using System.Net.Http.Json;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Infrastructure.Identity;
using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Support;

internal static class AuthTestHelpers
{
    public const string ValidPassword = "Sup3rStr0ng!Pass";
    public const string TermsVersion = "2026-06-17";

    public static RegisterParentRequest ValidRegister(string email = "parent@example.com", string? password = null) =>
        new(email, password ?? ValidPassword, "Sara", "en", TermsVersion, "Europe/London");

    /// <summary>
    /// Registers a parent and (optionally) verifies their email by reading
    /// the token from the tracking sender. Returns the created user id.
    /// </summary>
    public static async Task<Guid> RegisterAndVerifyAsync(this AuthTestFactory factory, HttpClient client, string email, bool verify = true)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/parent/register", ValidRegister(email));
        response.EnsureSuccessStatusCode();

        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByEmailAsync(email.ToLowerInvariant());
        if (user is null) throw new InvalidOperationException("registration did not create user");

        if (verify)
        {
            var token = await users.GenerateEmailConfirmationTokenAsync(user);
            var verifyResp = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new VerifyEmailRequest(user.Id, token));
            verifyResp.EnsureSuccessStatusCode();
        }

        return user.Id;
    }

    public static async Task<(HttpResponseMessage Response, LoginResponse? Body)> LoginAsync(
        this HttpClient client, string email, string? password = null)
    {
        var resp = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password ?? ValidPassword));
        if (!resp.IsSuccessStatusCode) return (resp, null);
        var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        return (resp, body);
    }

    public static string? ExtractRefreshCookieValue(this HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var values)) return null;
        foreach (var cookie in values)
        {
            if (!cookie.StartsWith("csk_rt=", StringComparison.Ordinal)) continue;
            var first = cookie.Split(';')[0];
            return first["csk_rt=".Length..];
        }
        return null;
    }

    public static int CountTokensFor(this AuthTestFactory factory, Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return db.RefreshTokens.Count(t => t.UserId == userId);
    }

    public static int CountActiveTokensFor(this AuthTestFactory factory, Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return db.RefreshTokens.Count(t => t.UserId == userId && t.RevokedAt == null);
    }
}

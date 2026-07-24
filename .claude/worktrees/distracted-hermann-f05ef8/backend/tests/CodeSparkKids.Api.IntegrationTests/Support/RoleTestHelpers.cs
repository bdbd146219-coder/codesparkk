using System.Net.Http.Headers;
using CodeSparkKids.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>
/// Test helpers for creating users in arbitrary roles (Admin/SuperAdmin/
/// Instructor/etc.) and obtaining a bearer token for them. Reusable across the
/// C1C admin task series.
/// </summary>
internal static class RoleTestHelpers
{
    /// <summary>
    /// Creates a confirmed, active user in <paramref name="role"/> (creating the
    /// role if needed) directly via Identity, then logs in and returns the
    /// access token.
    /// </summary>
    public static async Task<string> CreateRoleUserAndLoginAsync(
        this AuthTestFactory factory, HttpClient client, string email, string role)
    {
        await factory.CreateRoleUserAsync(email, role);
        var (resp, body) = await client.LoginAsync(email);
        resp.EnsureSuccessStatusCode();
        return body!.AccessToken;
    }

    /// <summary>
    /// Creates a confirmed, active user in <paramref name="role"/> (creating the
    /// role if needed) directly via Identity and returns the user id. Idempotent
    /// per email.
    /// </summary>
    public static async Task<Guid> CreateRoleUserAsync(this AuthTestFactory factory, string email, string role)
    {
        var normalized = email.ToLowerInvariant();
        using var scope = factory.Services.CreateScope();
        var sp = scope.ServiceProvider;
        var users = sp.GetRequiredService<UserManager<ApplicationUser>>();
        var roles = sp.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        if (!await roles.RoleExistsAsync(role))
            await roles.CreateAsync(new IdentityRole<Guid>(role) { Id = Guid.NewGuid() });

        var existing = await users.FindByEmailAsync(normalized);
        if (existing is not null) return existing.Id;

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = normalized,
            Email = normalized,
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true,
        };
        var result = await users.CreateAsync(user, AuthTestHelpers.ValidPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException(
                "Failed to create role user: " + string.Join(",", result.Errors.Select(e => e.Code)));
        await users.AddToRoleAsync(user, role);
        return user.Id;
    }

    public static HttpRequestMessage WithBearer(this HttpRequestMessage request, string accessToken)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return request;
    }
}

using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CodeSparkKids.Infrastructure.Persistence.Seeding;

/// <summary>
/// Development-only, opt-in seed of a single staff <see cref="AppRoles.Admin"/>
/// user so local end-to-end runs can authenticate against a real backend.
///
/// NEVER runs in Production — the caller (Program.cs) gates it on
/// <c>IsDevelopment()</c> AND the explicit <c>Dev:SeedStaffAdmin</c> flag. The
/// password is required from configuration (<c>Dev:StaffAdminPassword</c>) with
/// no shipped default, so this can never silently create a known-password admin
/// in any environment where the flag is accidentally left on. Idempotent: the
/// role + user are created only when missing.
/// </summary>
public static class DevStaffSeeder
{
    /// <summary>Default email when <c>Dev:StaffAdminEmail</c> is not set.</summary>
    public const string DefaultEmail = "e2e-admin@codesparkkids.local";

    public static async Task SeedAsync(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var users = serviceProvider.GetService<UserManager<ApplicationUser>>();
        var roles = serviceProvider.GetService<RoleManager<IdentityRole<Guid>>>();
        if (users is null || roles is null)
        {
            // Identity is only registered when a connection string is configured.
            return;
        }

        var email = (configuration["Dev:StaffAdminEmail"] ?? DefaultEmail).Trim().ToLowerInvariant();
        var password = configuration["Dev:StaffAdminPassword"];
        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "Dev:SeedStaffAdmin is on but Dev:StaffAdminPassword is not set — skipping staff admin seed.");
            return;
        }

        try
        {
            if (!await roles.RoleExistsAsync(AppRoles.Admin))
            {
                await roles.CreateAsync(new IdentityRole<Guid>(AppRoles.Admin) { Id = Guid.NewGuid() });
            }

            if (await users.FindByEmailAsync(email) is not null)
            {
                return; // idempotent — already seeded
            }

            var now = DateTime.UtcNow;
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                EmailConfirmed = true, // login requires a confirmed email
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            };

            var created = await users.CreateAsync(user, password);
            if (!created.Succeeded)
            {
                logger.LogError(
                    "Dev staff admin seed failed: {Errors}",
                    string.Join(",", created.Errors.Select(e => e.Code)));
                return;
            }

            await users.AddToRoleAsync(user, AppRoles.Admin);
            logger.LogInformation("Seeded dev staff admin {Email}.", email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Dev staff admin seeding failed.");
        }
    }
}

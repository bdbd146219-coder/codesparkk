using System.Text.Json;
using CodeSparkKids.Application.Common.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Infrastructure.Identity;

/// <summary>
/// Orchestrates parent authentication. Public methods are enumeration-safe
/// for register / forgot-password / resend-verification; throws
/// <see cref="AuthException"/> for credential / verification / lockout /
/// refresh failures. Every operation writes an audit entry.
/// </summary>
public sealed class AuthService(
    UserManager<ApplicationUser> users,
    SignInManager<ApplicationUser> signIn,
    RoleManager<IdentityRole<Guid>> roles,
    AppDbContext db,
    ITokenService tokens,
    IEmailSender email,
    IAuditWriter audit,
    IClock clock,
    IOptions<AuthOptions> options,
    IValidator<RegisterParentRequest> registerValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<ForgotPasswordRequest> forgotValidator,
    IValidator<ResetPasswordRequest> resetValidator,
    IValidator<VerifyEmailRequest> verifyValidator,
    IValidator<ResendVerificationRequest> resendValidator,
    ILogger<AuthService> log
) : IAuthService
{
    private readonly AuthOptions _options = options.Value;

    private static string Normalize(string raw) => raw.Trim().ToLowerInvariant();
    private static string SafeContext(object payload) => JsonSerializer.Serialize(payload);

    public async Task RegisterParentAsync(RegisterParentRequest request, RequestContext ctx, CancellationToken ct = default)
    {
        await registerValidator.ValidateAndThrowAsync(request, ct);

        var email_ = Normalize(request.Email);
        var existing = await users.FindByEmailAsync(email_);
        if (existing is not null)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.AuthRegister, AuditResults.Ignored,
                actorEmail: email_, clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
                contextJson: SafeContext(new { reason = "email-already-registered" })), ct);
            return;
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = email_,
                Email = email_,
                CreatedAt = clock.UtcNow,
                UpdatedAt = clock.UtcNow,
                IsActive = true,
            };
            var createResult = await users.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                log.LogWarning("Identity CreateAsync failed: {Codes}", string.Join(",", createResult.Errors.Select(e => e.Code)));
                throw new InvalidOperationException("Identity user creation failed.");
            }

            if (!await roles.RoleExistsAsync(AppRoles.Parent))
            {
                await roles.CreateAsync(new IdentityRole<Guid>(AppRoles.Parent) { Id = Guid.NewGuid() });
            }
            await users.AddToRoleAsync(user, AppRoles.Parent);

            var profile = ParentProfile.Create(
                userId: user.Id,
                displayName: request.DisplayName,
                preferredLocale: request.PreferredLocale,
                timeZone: string.IsNullOrWhiteSpace(request.TimeZone) ? "UTC" : request.TimeZone,
                consentVersion: request.AcceptedTermsVersion,
                nowUtc: clock.UtcNow);
            db.ParentProfiles.Add(profile);
            await db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);

            var verificationToken = await users.GenerateEmailConfirmationTokenAsync(user);
            await email.SendEmailVerificationAsync(user.Email!, user.Id, verificationToken, request.PreferredLocale, ct);

            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.AuthRegister, AuditResults.Success,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request, RequestContext ctx, CancellationToken ct = default)
    {
        await loginValidator.ValidateAndThrowAsync(request, ct);

        var email_ = Normalize(request.Email);
        var user = await users.FindByEmailAsync(email_);

        if (user is null || !user.IsActive || user.DeletedAt is not null)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.AuthLoginFailed, AuditResults.Failure,
                actorEmail: email_, clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
            throw new AuthException(401, ProblemTypes.InvalidCredentials, "auth.errors.invalidCredentials");
        }

        if (!user.EmailConfirmed)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.AuthLoginFailed, AuditResults.Denied,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
                contextJson: SafeContext(new { reason = "email-not-verified" })), ct);
            throw new AuthException(403, ProblemTypes.EmailNotVerified, "auth.errors.emailNotVerified");
        }

        var result = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            var retry = user.LockoutEnd.HasValue
                ? user.LockoutEnd.Value.UtcDateTime - clock.UtcNow
                : TimeSpan.FromMinutes(_options.LockoutDurationMinutes);
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.AuthLockout, AuditResults.Denied,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
            throw new AuthException(423, ProblemTypes.AccountLocked, "auth.errors.accountLocked", retry);
        }

        if (!result.Succeeded)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.AuthLoginFailed, AuditResults.Failure,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
            throw new AuthException(401, ProblemTypes.InvalidCredentials, "auth.errors.invalidCredentials");
        }

        var roleNames = await users.GetRolesAsync(user);
        var access = tokens.IssueAccessToken(user.Id, user.Email!, user.EmailConfirmed, roleNames.ToArray());
        var refresh = tokens.CreateRefreshToken();
        var refreshExpires = clock.UtcNow.AddDays(_options.RefreshTokenLifetimeDays);

        db.RefreshTokens.Add(RefreshToken.Create(
            user.Id, refresh.Hash, clock.UtcNow, refreshExpires,
            ctx.ClientIp, ctx.UserAgent, DeviceLabel.From(ctx.UserAgent)));
        await db.SaveChangesAsync(ct);

        var profile = await db.ParentProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        var dto = new AuthenticatedUserDto(
            user.Id, user.Email!, profile?.DisplayName ?? string.Empty,
            roleNames.ToArray(), user.EmailConfirmed,
            profile?.PreferredLocale ?? "en",
            profile?.TimeZone ?? "UTC",
            user.CreatedAt);

        await audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, AuditEventTypes.AuthLogin, AuditResults.Success,
            actorUserId: user.Id, actorEmail: user.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);

        return new LoginResult(access.Token, access.ExpiresAt, refresh.RawToken, refreshExpires, dto);
    }

    public async Task<RefreshResult> RefreshAsync(string? rawRefreshToken, RequestContext ctx, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(rawRefreshToken))
            throw new AuthException(401, ProblemTypes.RefreshInvalid, "auth.errors.refreshInvalid");

        var hash = tokens.HashRefreshToken(rawRefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null)
            throw new AuthException(401, ProblemTypes.RefreshInvalid, "auth.errors.refreshInvalid");

        if (stored.RevokedAt is not null)
        {
            if (stored.RevokedReason == RefreshTokenRevokedReasons.Rotated)
            {
                await RevokeAllActiveAsync(stored.UserId, RefreshTokenRevokedReasons.TheftDetected, ct);
                await audit.WriteAsync(AuditEntry.Create(
                    clock.UtcNow, AuditEventTypes.AuthRefreshReuse, AuditResults.Denied,
                    actorUserId: stored.UserId, clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
                throw new AuthException(401, ProblemTypes.RefreshTheft, "auth.errors.refreshTheft");
            }
            throw new AuthException(401, ProblemTypes.RefreshInvalid, "auth.errors.refreshInvalid");
        }

        if (clock.UtcNow >= stored.ExpiresAt)
            throw new AuthException(401, ProblemTypes.RefreshInvalid, "auth.errors.refreshInvalid");

        var user = await users.FindByIdAsync(stored.UserId.ToString());
        if (user is null || !user.IsActive || user.DeletedAt is not null)
            throw new AuthException(401, ProblemTypes.RefreshInvalid, "auth.errors.refreshInvalid");

        var fresh = tokens.CreateRefreshToken();
        stored.Revoke(clock.UtcNow, RefreshTokenRevokedReasons.Rotated, fresh.Hash);
        var newExpiresAt = clock.UtcNow.AddDays(_options.RefreshTokenLifetimeDays);
        db.RefreshTokens.Add(RefreshToken.Create(
            stored.UserId, fresh.Hash, clock.UtcNow, newExpiresAt,
            ctx.ClientIp, ctx.UserAgent, DeviceLabel.From(ctx.UserAgent)));
        await db.SaveChangesAsync(ct);

        var roleNames = await users.GetRolesAsync(user);
        var access = tokens.IssueAccessToken(user.Id, user.Email!, user.EmailConfirmed, roleNames.ToArray());

        await audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, AuditEventTypes.AuthRefresh, AuditResults.Success,
            actorUserId: user.Id, actorEmail: user.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);

        return new RefreshResult(access.Token, access.ExpiresAt, fresh.RawToken, newExpiresAt);
    }

    public async Task LogoutAsync(string? rawRefreshToken, RequestContext ctx, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(rawRefreshToken)) return;

        var hash = tokens.HashRefreshToken(rawRefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is null || stored.RevokedAt is not null) return;

        stored.Revoke(clock.UtcNow, RefreshTokenRevokedReasons.Logout);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, AuditEventTypes.AuthLogout, AuditResults.Success,
            actorUserId: stored.UserId, clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
    }

    public async Task<AuthenticatedUserDto?> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user is null || !user.IsActive || user.DeletedAt is not null) return null;
        var roleNames = await users.GetRolesAsync(user);
        var profile = await db.ParentProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        return new AuthenticatedUserDto(
            user.Id, user.Email!, profile?.DisplayName ?? string.Empty,
            roleNames.ToArray(), user.EmailConfirmed,
            profile?.PreferredLocale ?? "en",
            profile?.TimeZone ?? "UTC",
            user.CreatedAt);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, RequestContext ctx, CancellationToken ct = default)
    {
        await forgotValidator.ValidateAndThrowAsync(request, ct);

        var email_ = Normalize(request.Email);
        var user = await users.FindByEmailAsync(email_);

        if (user is not null && user.EmailConfirmed && user.IsActive && user.DeletedAt is null)
        {
            var token = await users.GeneratePasswordResetTokenAsync(user);
            var profile = await db.ParentProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
            await email.SendPasswordResetAsync(user.Email!, user.Id, token, profile?.PreferredLocale ?? "en", ct);
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.PasswordResetRequested, AuditResults.Success,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
        }
        else
        {
            await Task.Delay(50, ct);
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.PasswordResetRequested, AuditResults.Ignored,
                actorEmail: email_, clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
        }
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request, RequestContext ctx, CancellationToken ct = default)
    {
        await resetValidator.ValidateAndThrowAsync(request, ct);

        var user = await users.FindByIdAsync(request.UserId.ToString());
        if (user is null || !user.IsActive || user.DeletedAt is not null)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.PasswordReset, AuditResults.Failure,
                targetUserId: request.UserId, clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
            return false;
        }

        var result = await users.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.PasswordReset, AuditResults.Failure,
                targetUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
            return false;
        }

        await RevokeAllActiveAsync(user.Id, RefreshTokenRevokedReasons.PasswordReset, ct);
        user.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        var profile = await db.ParentProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
        await email.SendPasswordResetConfirmationAsync(user.Email!, profile?.PreferredLocale ?? "en", ct);

        await audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, AuditEventTypes.PasswordReset, AuditResults.Success,
            actorUserId: user.Id, actorEmail: user.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
        return true;
    }

    public async Task<VerifyEmailOutcome> VerifyEmailAsync(VerifyEmailRequest request, RequestContext ctx, CancellationToken ct = default)
    {
        await verifyValidator.ValidateAndThrowAsync(request, ct);

        var user = await users.FindByIdAsync(request.UserId.ToString());
        if (user is null || user.DeletedAt is not null) return VerifyEmailOutcome.Invalid;

        if (user.EmailConfirmed)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.EmailVerify, AuditResults.Ignored,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
                contextJson: SafeContext(new { reason = "already-verified" })), ct);
            return VerifyEmailOutcome.AlreadyVerified;
        }

        var result = await users.ConfirmEmailAsync(user, request.Token);
        if (!result.Succeeded)
        {
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.EmailVerify, AuditResults.Failure,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
            return VerifyEmailOutcome.Invalid;
        }

        user.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, AuditEventTypes.EmailVerify, AuditResults.Success,
            actorUserId: user.Id, actorEmail: user.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);

        return VerifyEmailOutcome.Verified;
    }

    public async Task ResendVerificationAsync(ResendVerificationRequest request, RequestContext ctx, CancellationToken ct = default)
    {
        await resendValidator.ValidateAndThrowAsync(request, ct);

        var email_ = Normalize(request.Email);
        var user = await users.FindByEmailAsync(email_);

        if (user is not null && !user.EmailConfirmed && user.IsActive && user.DeletedAt is null)
        {
            var token = await users.GenerateEmailConfirmationTokenAsync(user);
            var profile = await db.ParentProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id, ct);
            await email.SendEmailVerificationAsync(user.Email!, user.Id, token, profile?.PreferredLocale ?? "en", ct);
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.EmailResend, AuditResults.Success,
                actorUserId: user.Id, actorEmail: user.Email,
                clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
        }
        else
        {
            await Task.Delay(50, ct);
            await audit.WriteAsync(AuditEntry.Create(
                clock.UtcNow, AuditEventTypes.EmailResend, AuditResults.Ignored,
                actorEmail: email_, clientIp: ctx.ClientIp, userAgent: ctx.UserAgent), ct);
        }
    }

    private async Task RevokeAllActiveAsync(Guid userId, string reason, CancellationToken ct)
    {
        var active = await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var t in active) t.Revoke(clock.UtcNow, reason);
        if (active.Count > 0) await db.SaveChangesAsync(ct);
    }
}

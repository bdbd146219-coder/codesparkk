using CodeSparkKids.Application.DTOs.Auth;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Parent authentication service. All public methods are enumeration-safe:
/// they return the same shape regardless of whether the email exists.
/// </summary>
public interface IAuthService
{
    Task RegisterParentAsync(RegisterParentRequest request, RequestContext context, CancellationToken cancellationToken = default);

    Task<LoginResult> LoginAsync(LoginRequest request, RequestContext context, CancellationToken cancellationToken = default);

    Task<RefreshResult> RefreshAsync(string? rawRefreshToken, RequestContext context, CancellationToken cancellationToken = default);

    Task LogoutAsync(string? rawRefreshToken, RequestContext context, CancellationToken cancellationToken = default);

    Task<AuthenticatedUserDto?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task ForgotPasswordAsync(ForgotPasswordRequest request, RequestContext context, CancellationToken cancellationToken = default);

    Task<bool> ResetPasswordAsync(ResetPasswordRequest request, RequestContext context, CancellationToken cancellationToken = default);

    Task<VerifyEmailOutcome> VerifyEmailAsync(VerifyEmailRequest request, RequestContext context, CancellationToken cancellationToken = default);

    Task ResendVerificationAsync(ResendVerificationRequest request, RequestContext context, CancellationToken cancellationToken = default);
}

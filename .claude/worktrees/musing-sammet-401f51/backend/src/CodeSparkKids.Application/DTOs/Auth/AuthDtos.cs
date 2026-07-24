namespace CodeSparkKids.Application.DTOs.Auth;

public sealed record RequestContext(string? ClientIp, string? UserAgent);

public sealed record RegisterParentRequest(
    string Email,
    string Password,
    string DisplayName,
    string PreferredLocale,
    string AcceptedTermsVersion,
    string? TimeZone
);

public sealed record LoginRequest(string Email, string Password);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(Guid UserId, string Token, string NewPassword);

public sealed record VerifyEmailRequest(Guid UserId, string Token);

public sealed record ResendVerificationRequest(string Email);

public sealed record AuthenticatedUserDto(
    Guid Id,
    string Email,
    string DisplayName,
    string[] Roles,
    bool EmailVerified,
    string PreferredLocale,
    string TimeZone,
    DateTime CreatedAt
);

public sealed record LoginResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    AuthenticatedUserDto User
);

public sealed record RefreshResponse(string AccessToken, DateTime AccessTokenExpiresAt);

public sealed record GenericMessageResponse(string MessageKey);

public sealed record VerifyEmailResponse(bool Ok, bool AlreadyVerified);

public sealed record OkResponse(bool Ok = true);

// Internal results returned by IAuthService so the controller can split
// cookie-setting from response-body shaping without leaking the raw token.
public sealed record LoginResult(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RawRefreshToken,
    DateTime RefreshExpiresAt,
    AuthenticatedUserDto User
);

public sealed record RefreshResult(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RawRefreshToken,
    DateTime RefreshExpiresAt
);

public enum VerifyEmailOutcome
{
    Verified,
    AlreadyVerified,
    Invalid,
}

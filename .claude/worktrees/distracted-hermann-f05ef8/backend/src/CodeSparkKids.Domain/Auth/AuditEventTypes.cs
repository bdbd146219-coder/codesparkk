namespace CodeSparkKids.Domain.Auth;

/// <summary>
/// Stable string identifiers for auth-related audit events. Kept as constants
/// (not enums) so the audit log remains queryable from raw SQL without enum
/// translation, and so renaming an enum member doesn't silently break history.
/// </summary>
public static class AuditEventTypes
{
    public const string AuthRegister = "AuthRegister";
    public const string AuthLogin = "AuthLogin";
    public const string AuthLoginFailed = "AuthLoginFailed";
    public const string AuthLockout = "AuthLockout";
    public const string AuthRefresh = "AuthRefresh";
    public const string AuthRefreshReuse = "AuthRefreshReuse";
    public const string AuthLogout = "AuthLogout";
    public const string PasswordResetRequested = "PasswordResetRequested";
    public const string PasswordReset = "PasswordReset";
    public const string EmailVerify = "EmailVerify";
    public const string EmailResend = "EmailResend";
}

public static class AuditResults
{
    public const string Success = "success";
    public const string Failure = "failure";
    public const string Denied = "denied";
    public const string Ignored = "ignored";
}

public static class RefreshTokenRevokedReasons
{
    public const string Rotated = "rotated";
    public const string Logout = "logout";
    public const string PasswordReset = "password-reset";
    public const string TheftDetected = "theft-detected";
    public const string AdminRevoke = "admin-revoke";
}

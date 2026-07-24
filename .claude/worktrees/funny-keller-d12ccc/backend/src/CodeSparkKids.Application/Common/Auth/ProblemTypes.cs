namespace CodeSparkKids.Application.Common.Auth;

/// <summary>
/// Stable <c>type</c> URIs for ProblemDetails responses. Frontend looks these
/// up to render localised error copy — never put user-facing English here.
/// </summary>
public static class ProblemTypes
{
    private const string Root = "https://codesparkkids.dev/errors/";

    public const string Validation = Root + "validation";
    public const string InvalidCredentials = Root + "auth/invalid-credentials";
    public const string EmailNotVerified = Root + "auth/email-not-verified";
    public const string AccountLocked = Root + "auth/account-locked";
    public const string RefreshInvalid = Root + "auth/refresh-invalid";
    public const string RefreshTheft = Root + "auth/refresh-theft";
    public const string ResetInvalid = Root + "auth/reset-invalid";
    public const string VerifyInvalid = Root + "auth/verify-invalid";
    public const string AccessInvalid = Root + "auth/access-invalid";
}

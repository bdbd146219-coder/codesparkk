namespace CodeSparkKids.Application.Common.Auth;

/// <summary>
/// Thrown by auth services to signal a known auth failure. The API layer
/// catches these and renders ProblemDetails. Never carries user-facing
/// English copy — only stable type URIs and translation keys.
/// </summary>
public sealed class AuthException(int statusCode, string problemType, string titleKey, TimeSpan? retryAfter = null)
    : Exception(titleKey)
{
    public int StatusCode { get; } = statusCode;
    public string ProblemType { get; } = problemType;
    public string TitleKey { get; } = titleKey;
    public TimeSpan? RetryAfter { get; } = retryAfter;
}

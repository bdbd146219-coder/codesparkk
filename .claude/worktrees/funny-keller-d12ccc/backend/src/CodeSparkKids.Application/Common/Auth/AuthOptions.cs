namespace CodeSparkKids.Application.Common.Auth;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    /// <summary>Symmetric signing key for HS256 JWTs. Must be ≥32 bytes random.</summary>
    public string JwtSigningKey { get; set; } = string.Empty;
    public string JwtIssuer { get; set; } = string.Empty;
    public string JwtAudience { get; set; } = string.Empty;

    public int AccessTokenLifetimeMinutes { get; set; } = 15;
    public int RefreshTokenLifetimeDays { get; set; } = 30;

    /// <summary>The terms-of-service version currently in force. Clients must
    /// echo this on register so we record exactly which version was accepted.</summary>
    public string CurrentTermsVersion { get; set; } = "2026-06-17";

    public string CookieName { get; set; } = "csk_rt";
    public string CookieDomain { get; set; } = string.Empty;
    public string CookiePath { get; set; } = "/api/v1/auth";
    public bool RequireHttps { get; set; } = true;

    public int LockoutMaxFailedAttempts { get; set; } = 5;
    public int LockoutDurationMinutes { get; set; } = 15;

    /// <summary>Equal-time padding for enumeration-sensitive endpoints — ms.</summary>
    public int EnumerationPaddingMs { get; set; } = 50;
}

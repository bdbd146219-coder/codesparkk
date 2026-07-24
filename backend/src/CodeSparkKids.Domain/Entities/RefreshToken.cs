namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// Server-side record of a refresh token. Only the SHA-256 hash of the raw
/// token is persisted — the raw token never touches the database.
/// Rotation chain: when a token is rotated, <see cref="RevokedAt"/> is set
/// with reason "rotated" and <see cref="ReplacedByTokenHash"/> points to the
/// successor. If a rotated token is ever presented again, reuse has been
/// detected: revoke the entire chain.
/// </summary>
public sealed class RefreshToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = string.Empty;
    public DateTime IssuedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public string? RevokedReason { get; private set; }
    public string? ReplacedByTokenHash { get; private set; }
    public string? ClientIp { get; private set; }
    public string? UserAgent { get; private set; }
    public string? DeviceLabel { get; private set; }

    private RefreshToken() { }

    public static RefreshToken Create(
        Guid userId,
        string tokenHash,
        DateTime issuedAtUtc,
        DateTime expiresAtUtc,
        string? clientIp,
        string? userAgent,
        string? deviceLabel)
    {
        return new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            IssuedAt = issuedAtUtc,
            ExpiresAt = expiresAtUtc,
            ClientIp = clientIp,
            UserAgent = userAgent,
            DeviceLabel = deviceLabel,
        };
    }

    public bool IsActive(DateTime nowUtc) => RevokedAt is null && nowUtc < ExpiresAt;

    public void Revoke(DateTime nowUtc, string reason, string? replacedByTokenHash = null)
    {
        if (RevokedAt is not null) return;
        RevokedAt = nowUtc;
        RevokedReason = reason;
        ReplacedByTokenHash = replacedByTokenHash;
    }
}

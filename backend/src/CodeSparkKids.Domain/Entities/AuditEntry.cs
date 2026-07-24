namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// Append-only audit log entry. NEVER contains passwords, raw tokens, or
/// token hashes. <see cref="ContextJson"/> is freeform but must only carry
/// safe fields (email being validated, IP, UA, etc.).
/// </summary>
public sealed class AuditEntry
{
    public Guid Id { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public string EventType { get; private set; } = string.Empty;
    public string Result { get; private set; } = string.Empty;
    public Guid? ActorUserId { get; private set; }
    public string? ActorEmail { get; private set; }
    public Guid? TargetUserId { get; private set; }
    public string? ClientIp { get; private set; }
    public string? UserAgent { get; private set; }
    public string? ContextJson { get; private set; }

    private AuditEntry() { }

    public static AuditEntry Create(
        DateTime occurredAtUtc,
        string eventType,
        string result,
        Guid? actorUserId = null,
        string? actorEmail = null,
        Guid? targetUserId = null,
        string? clientIp = null,
        string? userAgent = null,
        string? contextJson = null)
    {
        return new AuditEntry
        {
            Id = Guid.NewGuid(),
            OccurredAt = occurredAtUtc,
            EventType = eventType,
            Result = result,
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            TargetUserId = targetUserId,
            ClientIp = Truncate(clientIp, 45),
            UserAgent = Truncate(userAgent, 255),
            ContextJson = Truncate(contextJson, 1000),
        };
    }

    private static string? Truncate(string? value, int max) =>
        value is null ? null : value.Length <= max ? value : value[..max];
}

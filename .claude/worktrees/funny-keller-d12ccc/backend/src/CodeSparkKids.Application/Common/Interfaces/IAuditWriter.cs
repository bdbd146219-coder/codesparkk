using CodeSparkKids.Domain.Entities;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Writes append-only audit entries on a fresh scope (independent of the
/// caller's DbContext) so audit logging never blocks or rolls back with the
/// main operation. Implementations must swallow exceptions and log warnings.
/// </summary>
public interface IAuditWriter
{
    Task WriteAsync(AuditEntry entry, CancellationToken cancellationToken = default);
}

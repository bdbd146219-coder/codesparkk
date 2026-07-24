using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CodeSparkKids.Infrastructure.Audit;

/// <summary>
/// Writes audit entries on a fresh DI scope so failures in (or rollbacks of)
/// the calling business operation do not lose audit history. Never throws.
/// </summary>
public sealed class AuditWriter(IServiceScopeFactory scopeFactory, ILogger<AuditWriter> log) : IAuditWriter
{
    public async Task WriteAsync(AuditEntry entry, CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetService<AppDbContext>();
            if (db is null)
            {
                log.LogWarning("AppDbContext not registered; dropping audit entry {EventType}", entry.EventType);
                return;
            }
            db.Set<AuditEntry>().Add(entry);
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Failed to write audit entry {EventType}", entry.EventType);
        }
    }
}

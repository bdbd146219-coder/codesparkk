using CodeSparkKids.Application.DTOs.Admin;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Admin-only catalog media orphan management (C4L). Scans the <c>catalog/</c>
/// prefix of the storage root, cross-checks every file against the media keys
/// persisted on live catalog entities (courses and learning paths, including
/// soft-deleted ones — they can be restored, so their media stays protected),
/// and reports orphan candidates older than the grace period. Deletion happens
/// only when the request explicitly sets <c>DryRun = false</c>, and is never
/// triggered automatically (no startup hook, no background schedule).
/// </summary>
public interface ICatalogMediaCleanupService
{
    Task<CatalogMediaCleanupResult> RunAsync(
        CatalogMediaCleanupRequest request,
        CancellationToken cancellationToken = default);
}

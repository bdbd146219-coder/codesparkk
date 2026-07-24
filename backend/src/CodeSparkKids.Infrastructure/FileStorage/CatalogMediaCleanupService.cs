using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CodeSparkKids.Infrastructure.FileStorage;

/// <summary>
/// Conservative catalog media orphan management (C4L). A file is an orphan
/// candidate only when <em>all</em> of the following hold:
///
///   1. it lives under the <c>catalog/</c> prefix of the storage root,
///   2. its root-relative key passes <see cref="Application.Common.Media.CatalogMediaKey"/>,
///   3. no catalog entity references the key (courses and learning paths,
///      thumbnail + hero, <b>including soft-deleted rows</b> — restorable
///      entities keep their media protected; comparison is case-insensitive so
///      a case-mismatched reference still protects the file), and
///   4. it is older than the grace period (clamped to the policy bounds, so a
///      too-small value can never slip through and delete a fresh upload).
///
/// Deletion happens only when the request explicitly sets <c>DryRun = false</c>,
/// goes file-by-file through <see cref="ICatalogMediaMaintenanceStore"/> (which
/// re-validates the key and canonical containment), and logs every deleted key.
/// Nothing here runs automatically — no startup hook, no background schedule.
/// Missing referenced files (a live key with no file) are reported separately
/// and are never deletion candidates.
/// </summary>
public sealed class CatalogMediaCleanupService(
    AppDbContext db,
    ICatalogMediaMaintenanceStore store,
    IClock clock,
    ILogger<CatalogMediaCleanupService> logger) : ICatalogMediaCleanupService
{
    private const string OrphanReason = "Not referenced and older than grace period";

    public async Task<CatalogMediaCleanupResult> RunAsync(
        CatalogMediaCleanupRequest request,
        CancellationToken cancellationToken = default)
    {
        // Defence in depth: the controller rejects out-of-range values with 400,
        // and the service additionally clamps so no caller can run with a grace
        // period below the safe minimum.
        var gracePeriodHours = Math.Clamp(
            request.GracePeriodHours ?? CatalogMediaCleanupPolicy.DefaultGracePeriodHours,
            CatalogMediaCleanupPolicy.MinGracePeriodHours,
            CatalogMediaCleanupPolicy.MaxGracePeriodHours);
        var threshold = clock.UtcNow.AddHours(-gracePeriodHours);

        var liveKeys = await CollectLiveReferenceKeysAsync(cancellationToken);
        var files = store.ListCatalogFiles();
        var fileKeys = new HashSet<string>(files.Select(f => f.Key), StringComparer.OrdinalIgnoreCase);

        var candidates = new List<CatalogMediaOrphanCandidateDto>();
        var tooYoung = 0;
        var invalid = 0;

        foreach (var file in files)
        {
            if (!file.HasValidKey)
            {
                // Unexpected content under catalog/ (wrong extension, unsafe
                // name…) — surfaced as a count for operators, never deleted.
                invalid++;
                continue;
            }

            if (liveKeys.Contains(file.Key))
            {
                continue; // referenced → protected
            }

            if (file.LastWriteTimeUtc > threshold)
            {
                tooYoung++; // possibly a just-uploaded, not-yet-saved key
                continue;
            }

            candidates.Add(new CatalogMediaOrphanCandidateDto(
                file.Key, file.SizeBytes, file.LastWriteTimeUtc, OrphanReason));
        }

        var deleted = 0;
        if (!request.DryRun)
        {
            foreach (var candidate in candidates)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (store.DeleteCatalogFile(candidate.Key))
                {
                    deleted++;
                    logger.LogInformation("Catalog media cleanup deleted orphan {Key}", candidate.Key);
                }
                else
                {
                    logger.LogWarning("Catalog media cleanup could not delete {Key}", candidate.Key);
                }
            }

            logger.LogInformation(
                "Catalog media cleanup run: {Deleted}/{Candidates} orphan(s) deleted (grace {Grace}h).",
                deleted, candidates.Count, gracePeriodHours);
        }

        // Live catalog/ keys with no file on disk — operator signal (e.g. a
        // volume restored behind the database), never a deletion candidate.
        var missingReferenced = liveKeys
            .Where(k => k.StartsWith(LocalDiskCatalogMediaStore.CatalogPrefix, StringComparison.OrdinalIgnoreCase) &&
                        !fileKeys.Contains(k))
            .OrderBy(k => k, StringComparer.Ordinal)
            .ToList();

        return new CatalogMediaCleanupResult(
            DryRun: request.DryRun,
            GracePeriodHours: gracePeriodHours,
            LiveReferenceCount: liveKeys.Count,
            FileCount: files.Count,
            OrphanCandidateCount: candidates.Count,
            DeletedCount: deleted,
            SkippedCount: candidates.Count - deleted,
            TooYoungCount: tooYoung,
            InvalidKeyCount: invalid,
            MissingReferencedCount: missingReferenced.Count,
            Candidates: candidates
                .OrderBy(c => c.Key, StringComparer.Ordinal)
                .Take(CatalogMediaCleanupPolicy.MaxKeysReturned)
                .ToList(),
            MissingReferencedKeys: missingReferenced
                .Take(CatalogMediaCleanupPolicy.MaxKeysReturned)
                .ToList());
    }

    /// <summary>
    /// Every media key persisted on a catalog entity: course + learning-path
    /// thumbnails and heroes. Soft-deleted rows are included on purpose
    /// (IgnoreQueryFilters) — they can be restored, so their media is live.
    /// Null/blank keys are ignored; duplicates collapse into the set.
    /// </summary>
    private async Task<HashSet<string>> CollectLiveReferenceKeysAsync(CancellationToken ct)
    {
        var courseKeys = await db.Courses
            .IgnoreQueryFilters()
            .Select(c => new { c.Media.ThumbnailKey, c.Media.HeroKey })
            .ToListAsync(ct);

        var pathKeys = await db.LearningPaths
            .IgnoreQueryFilters()
            .Select(p => new { p.Media.ThumbnailKey, p.Media.HeroKey })
            .ToListAsync(ct);

        var live = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var pair in courseKeys.Concat(pathKeys))
        {
            Add(live, pair.ThumbnailKey);
            Add(live, pair.HeroKey);
        }

        return live;

        static void Add(HashSet<string> set, string? key)
        {
            var trimmed = key?.Trim();
            if (!string.IsNullOrEmpty(trimmed)) set.Add(trimmed);
        }
    }
}

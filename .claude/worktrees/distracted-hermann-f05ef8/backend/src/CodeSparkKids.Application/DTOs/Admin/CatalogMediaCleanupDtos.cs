namespace CodeSparkKids.Application.DTOs.Admin;

/// <summary>
/// Request for the admin catalog-media orphan cleanup (C4L).
/// <see cref="DryRun"/> defaults to <c>true</c> — nothing is ever deleted
/// unless the caller explicitly sends <c>"dryRun": false</c>.
/// <see cref="GracePeriodHours"/> defaults to
/// <see cref="CatalogMediaCleanupPolicy.DefaultGracePeriodHours"/> when omitted.
/// </summary>
public sealed record CatalogMediaCleanupRequest(
    bool DryRun = true,
    int? GracePeriodHours = null);

/// <summary>
/// One orphan candidate: a file under <c>catalog/</c> that no catalog entity
/// references and that is older than the grace period. Carries the safe
/// relative storage key only — never a disk path.
/// </summary>
public sealed record CatalogMediaOrphanCandidateDto(
    string Key,
    long SizeBytes,
    DateTime LastModifiedUtc,
    string Reason);

/// <summary>
/// Outcome of an orphan scan/cleanup run. Counts cover the whole scan;
/// <see cref="Candidates"/> and <see cref="MissingReferencedKeys"/> are capped
/// at <see cref="CatalogMediaCleanupPolicy.MaxKeysReturned"/> entries each (the
/// counts stay exact). Missing referenced files are live DB keys with no file
/// on disk — reported for operators (backup drift), never deletion candidates.
/// </summary>
public sealed record CatalogMediaCleanupResult(
    bool DryRun,
    int GracePeriodHours,
    int LiveReferenceCount,
    int FileCount,
    int OrphanCandidateCount,
    int DeletedCount,
    int SkippedCount,
    int TooYoungCount,
    int InvalidKeyCount,
    int MissingReferencedCount,
    IReadOnlyList<CatalogMediaOrphanCandidateDto> Candidates,
    IReadOnlyList<string> MissingReferencedKeys);

/// <summary>Fixed, deliberately conservative cleanup policy bounds (C4L).</summary>
public static class CatalogMediaCleanupPolicy
{
    /// <summary>Grace period applied when the request does not specify one.</summary>
    public const int DefaultGracePeriodHours = 24;

    /// <summary>Smallest accepted grace period — a zero/negative grace could
    /// delete an upload that is mid-save, so it is rejected outright.</summary>
    public const int MinGracePeriodHours = 1;

    /// <summary>Largest accepted grace period (one year).</summary>
    public const int MaxGracePeriodHours = 8760;

    /// <summary>Cap on returned candidate/missing key lists (counts stay exact).</summary>
    public const int MaxKeysReturned = 200;

    public static bool IsValidGracePeriod(int hours) =>
        hours is >= MinGracePeriodHours and <= MaxGracePeriodHours;
}

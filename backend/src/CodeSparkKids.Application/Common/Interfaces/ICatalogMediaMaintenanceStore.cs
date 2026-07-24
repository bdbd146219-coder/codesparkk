namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Maintenance surface of the catalog media root (C4L), used only by the
/// admin-only orphan cleanup service. Kept separate from
/// <see cref="ICatalogMediaStore"/> (public read) and
/// <see cref="ICatalogMediaWriteStore"/> (admin upload) so neither of those
/// surfaces can ever enumerate or delete.
///
/// Everything is addressed by relative storage keys — never absolute paths —
/// and the implementation confines both listing and deletion to the
/// <c>catalog/</c> prefix under the configured storage root.
/// </summary>
public interface ICatalogMediaMaintenanceStore
{
    /// <summary>
    /// Enumerate every file under the <c>catalog/</c> prefix of the storage
    /// root. Keys are normalized to forward slashes and relative to the root;
    /// <see cref="CatalogMediaFileRecord.HasValidKey"/> reports whether the key
    /// would pass <c>CatalogMediaKey</c> validation (invalid files are listed so
    /// they can be counted, but are never deletion candidates). Returns an empty
    /// list when the root or prefix does not exist.
    /// </summary>
    IReadOnlyList<CatalogMediaFileRecord> ListCatalogFiles();

    /// <summary>
    /// Delete a single catalog media file by key. Refuses (returns
    /// <c>false</c>) unless the key passes <c>CatalogMediaKey</c> validation,
    /// starts with <c>catalog/</c>, and canonically resolves inside the storage
    /// root — the same layered checks as the read/write paths. Never deletes
    /// directories.
    /// </summary>
    bool DeleteCatalogFile(string key);
}

/// <summary>A file found under the catalog media prefix: its root-relative
/// key (forward slashes), size, last write time (UTC), and whether the key
/// would be servable/deletable per <c>CatalogMediaKey</c>.</summary>
public sealed record CatalogMediaFileRecord(
    string Key,
    long SizeBytes,
    DateTime LastWriteTimeUtc,
    bool HasValidKey);

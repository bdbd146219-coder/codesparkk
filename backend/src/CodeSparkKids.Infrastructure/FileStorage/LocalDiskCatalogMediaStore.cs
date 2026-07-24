using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.Common.Media;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Infrastructure.FileStorage;

/// <summary>
/// Reads and writes public catalog media on the local storage root, addressed by
/// an opaque key. A key is honoured only when <see cref="CatalogMediaKey"/> deems
/// it a safe image key <em>and</em> the resolved absolute path stays within the
/// configured root (canonical containment — a second line of defence behind the
/// string checks). Reads return <c>null</c> on any failure so the caller 404s
/// without revealing whether the key was invalid or the file simply absent;
/// writes (admin-only, behind <see cref="ICatalogMediaWriteStore"/>) refuse
/// outright rather than escape the root. The maintenance surface
/// (<see cref="ICatalogMediaMaintenanceStore"/>, C4L) additionally confines
/// enumeration and deletion to the <c>catalog/</c> prefix.
/// </summary>
public sealed class LocalDiskCatalogMediaStore(IOptions<LocalDiskFileStorageOptions> options)
    : ICatalogMediaStore, ICatalogMediaWriteStore, ICatalogMediaMaintenanceStore
{
    /// <summary>The only prefix cleanup may enumerate or delete under.</summary>
    public const string CatalogPrefix = "catalog/";

    private readonly string _root = Path.GetFullPath(options.Value.RootPath);

    public Task<CatalogMediaResult?> OpenAsync(
        string? key,
        CancellationToken cancellationToken = default)
    {
        if (!TryResolveContainedPath(key, out var fullPath, out var contentType) ||
            !File.Exists(fullPath))
        {
            return Task.FromResult<CatalogMediaResult?>(null);
        }

        Stream stream = new FileStream(
            fullPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 64 * 1024,
            useAsync: true);

        return Task.FromResult<CatalogMediaResult?>(new CatalogMediaResult(stream, contentType));
    }

    public async Task SaveAsync(
        string key,
        Stream content,
        CancellationToken cancellationToken = default)
    {
        if (!TryResolveContainedPath(key, out var fullPath, out _))
        {
            // The controller only ever passes a freshly generated, validated key,
            // so this is a guard against future misuse, never a normal path.
            throw new InvalidOperationException(
                "Refusing to write an unsafe or non-containable catalog media key.");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var file = new FileStream(
            fullPath,
            FileMode.Create,
            FileAccess.Write,
            FileShare.None,
            bufferSize: 64 * 1024,
            useAsync: true);

        await content.CopyToAsync(file, cancellationToken);
    }

    // --- Maintenance (C4L: admin-only orphan cleanup) ------------------------

    public IReadOnlyList<CatalogMediaFileRecord> ListCatalogFiles()
    {
        var catalogRoot = Path.Combine(_root, "catalog");
        if (!Directory.Exists(catalogRoot))
        {
            return Array.Empty<CatalogMediaFileRecord>();
        }

        var records = new List<CatalogMediaFileRecord>();
        foreach (var path in Directory.EnumerateFiles(catalogRoot, "*", SearchOption.AllDirectories))
        {
            var info = new FileInfo(path);
            // Root-relative, forward-slash key — the only shape ever surfaced.
            var key = Path.GetRelativePath(_root, path).Replace(Path.DirectorySeparatorChar, '/');
            var hasValidKey =
                key.StartsWith(CatalogPrefix, StringComparison.OrdinalIgnoreCase) &&
                CatalogMediaKey.TryResolve(key, out _, out _);
            records.Add(new CatalogMediaFileRecord(key, info.Length, info.LastWriteTimeUtc, hasValidKey));
        }

        return records;
    }

    public bool DeleteCatalogFile(string key)
    {
        // Layered refusal, mirroring the read/write paths: string-validated key,
        // catalog/ prefix, then canonical containment. Files only — never a dir.
        if (string.IsNullOrWhiteSpace(key) ||
            !key.StartsWith(CatalogPrefix, StringComparison.OrdinalIgnoreCase) ||
            !TryResolveContainedPath(key, out var fullPath, out _) ||
            !File.Exists(fullPath))
        {
            return false;
        }

        File.Delete(fullPath);
        return true;
    }

    /// <summary>
    /// Validate the key and resolve it to an absolute path proven to live under
    /// the storage root. Shared by both the read and write paths so containment
    /// is enforced identically for each.
    /// </summary>
    private bool TryResolveContainedPath(string? key, out string fullPath, out string contentType)
    {
        fullPath = string.Empty;

        if (!CatalogMediaKey.TryResolve(key, out var normalizedKey, out contentType))
        {
            return false;
        }

        var rootWithSeparator = _root.EndsWith(Path.DirectorySeparatorChar)
            ? _root
            : _root + Path.DirectorySeparatorChar;

        var candidate = Path.GetFullPath(Path.Combine(_root, normalizedKey));
        if (!candidate.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        fullPath = candidate;
        return true;
    }
}

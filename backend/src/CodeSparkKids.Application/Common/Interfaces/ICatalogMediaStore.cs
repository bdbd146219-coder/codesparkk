namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Read-only accessor for public catalog media (course / learning-path
/// thumbnails and heroes) addressed by an opaque storage key. Returns
/// <c>null</c> for any key that is invalid, unsupported, or missing — callers
/// must treat all three the same (HTTP 404) so the endpoint cannot be used to
/// probe the filesystem or distinguish a bad key from an absent file.
/// </summary>
public interface ICatalogMediaStore
{
    Task<CatalogMediaResult?> OpenAsync(string? key, CancellationToken cancellationToken = default);
}

/// <summary>A resolved, safe-to-serve catalog media file: an open read stream
/// plus the allow-listed image content type. The caller owns the stream.</summary>
public sealed record CatalogMediaResult(Stream Content, string ContentType);

/// <summary>
/// Write side of the catalog media root, used only by the authenticated,
/// staff-only admin upload endpoint. Kept separate from
/// <see cref="ICatalogMediaStore"/> so the public read controller depends on a
/// read-only surface and cannot write. The key must already be a valid
/// <c>CatalogMediaKey</c>; the implementation re-checks it and enforces
/// canonical containment under the storage root before writing.
/// </summary>
public interface ICatalogMediaWriteStore
{
    Task SaveAsync(string key, Stream content, CancellationToken cancellationToken = default);
}

namespace CodeSparkKids.Application.Common.Media;

/// <summary>
/// Pure validation and content-type policy for public catalog media keys.
///
/// A key is an opaque, relative storage path such as
/// <c>courses/python/thumb.png</c>. Only safe, image-typed, non-traversing
/// relative keys are accepted; every other input is rejected so the media
/// endpoint can return 404 without ever touching the filesystem. This type has
/// no I/O and is exhaustively unit-tested — it is the first line of defence
/// (the disk store adds a second, canonical-containment check).
/// </summary>
public static class CatalogMediaKey
{
    /// <summary>Max key length — matches the admin media-key column bound (256).</summary>
    public const int MaxLength = 256;

    // Image types only. SVG is intentionally excluded: it is XML and can carry
    // scripts, so serving it publicly without sanitisation is unsafe.
    private static readonly IReadOnlyDictionary<string, string> ContentTypesByExtension =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp",
            [".gif"] = "image/gif",
        };

    /// <summary>
    /// Whether <paramref name="extension"/> (including the dot, e.g. <c>.png</c>)
    /// is an allow-listed image type, and if so its content type. Exposes the
    /// single SVG-excluding allow-list so the admin upload policy accepts exactly
    /// the same types the public endpoint will later serve — no drift, no chance
    /// of one side re-admitting SVG.
    /// </summary>
    public static bool TryGetImageContentType(string? extension, out string contentType)
    {
        if (!string.IsNullOrEmpty(extension) &&
            ContentTypesByExtension.TryGetValue(extension, out var resolved))
        {
            contentType = resolved;
            return true;
        }

        contentType = string.Empty;
        return false;
    }

    /// <summary>
    /// Validate <paramref name="key"/> and, if it is a safe image key, return the
    /// normalised key and its allow-listed content type. Returns <c>false</c> for
    /// any unsafe, malformed, or unsupported key.
    /// </summary>
    public static bool TryResolve(string? key, out string normalizedKey, out string contentType)
    {
        normalizedKey = string.Empty;
        contentType = string.Empty;

        if (string.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        if (key.Length > MaxLength)
        {
            return false;
        }

        // Reject any control character (includes the NUL byte).
        foreach (var ch in key)
        {
            if (char.IsControl(ch))
            {
                return false;
            }
        }

        // Reject traversal / absolute / scheme / separator markers up front.
        if (key.Contains("..", StringComparison.Ordinal)) return false; // path traversal
        if (key.Contains('\\')) return false; // backslash / Windows separator
        if (key.Contains(':')) return false; // drive letter or scheme (http:, data:, javascript:, file:)
        if (key.StartsWith('/')) return false; // rooted path (/etc/passwd)
        if (key.Contains("//", StringComparison.Ordinal)) return false; // protocol-relative or empty segment

        // Every '/'-separated segment must be a real name (also catches a
        // trailing slash, and "." / ".." which the checks above already block).
        foreach (var segment in key.Split('/'))
        {
            if (segment.Length == 0 || segment is "." or "..")
            {
                return false;
            }
        }

        // Require a real filename stem, so bare-extension dotfiles like ".png"
        // (GetExtension(".png") == ".png") are rejected rather than served.
        if (Path.GetFileNameWithoutExtension(key).Length == 0)
        {
            return false;
        }

        var extension = Path.GetExtension(key);
        if (extension.Length == 0 || !ContentTypesByExtension.TryGetValue(extension, out var resolved))
        {
            return false;
        }

        normalizedKey = key;
        contentType = resolved;
        return true;
    }
}

using System.Text;

namespace CodeSparkKids.Application.Common.Media;

/// <summary>
/// Pure policy for admin catalog-media uploads: which files are safe to accept,
/// and how a safe, publicly-servable storage key is generated. No I/O — the
/// caller reads the stream and performs the write.
///
/// Content type is decided by <em>sniffing the magic bytes</em>, never by
/// trusting the client's filename or declared <c>Content-Type</c>. A disguised
/// <c>.svg</c>/<c>.html</c>/<c>.exe</c>, a double-extension trick, or a spoofed
/// MIME type all fail the sniff and are rejected. Generated keys are always
/// re-validated with <see cref="CatalogMediaKey"/> so an upload can only ever
/// produce a key the public read endpoint is willing to serve.
/// </summary>
public static class CatalogMediaUpload
{
    /// <summary>Largest accepted upload — catalog art is small; 5 MB is generous.</summary>
    public const long MaxSizeBytes = 5 * 1024 * 1024;

    /// <summary>Header bytes the sniffer needs (WebP checks offsets 8..11).</summary>
    public const int SniffLength = 12;

    public const string KindCourseThumbnail = "course-thumbnail";
    public const string KindCourseHero = "course-hero";
    public const string KindLearningPathThumbnail = "learning-path-thumbnail";

    /// <summary>The accepted <c>kind</c> values (for docs / tests).</summary>
    public static readonly string[] Kinds =
        [KindCourseThumbnail, KindCourseHero, KindLearningPathThumbnail];

    public enum Failure
    {
        None,
        Empty,
        TooLarge,
        UnknownKind,
        UnsupportedType,
    }

    public static bool IsKnownKind(string? kind) =>
        kind is KindCourseThumbnail or KindCourseHero or KindLearningPathThumbnail;

    /// <summary>
    /// Sniff raster magic bytes and, if recognised, return the normalised stored
    /// extension (png / jpg / webp / gif). SVG is XML, not a raster, so it never
    /// matches — the exact intent. Filename/declared type are ignored.
    /// </summary>
    public static bool TryDetectImageType(ReadOnlySpan<byte> header, out string extension)
    {
        extension = string.Empty;

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (header.Length >= 8 &&
            header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
        {
            extension = "png";
            return true;
        }

        // JPEG: FF D8 FF
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            extension = "jpg";
            return true;
        }

        // GIF: "GIF8" (covers 87a / 89a)
        if (header.Length >= 4 &&
            header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38)
        {
            extension = "gif";
            return true;
        }

        // WebP: "RIFF" .... "WEBP"
        if (header.Length >= 12 &&
            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
        {
            extension = "webp";
            return true;
        }

        return false;
    }

    /// <summary>
    /// Validate size, kind, and sniffed content. On success yields the stored
    /// extension and its allow-listed content type; otherwise a specific failure.
    /// </summary>
    public static Failure Validate(
        string? kind,
        long sizeBytes,
        ReadOnlySpan<byte> header,
        out string extension,
        out string contentType)
    {
        extension = string.Empty;
        contentType = string.Empty;

        if (sizeBytes <= 0) return Failure.Empty;
        if (sizeBytes > MaxSizeBytes) return Failure.TooLarge;
        if (!IsKnownKind(kind)) return Failure.UnknownKind;
        if (!TryDetectImageType(header, out extension)) return Failure.UnsupportedType;

        // Map the sniffed extension to a content type through the SAME allow-list
        // the public endpoint serves from — one source of truth, SVG excluded.
        if (!CatalogMediaKey.TryGetImageContentType($".{extension}", out contentType))
        {
            return Failure.UnsupportedType;
        }

        return Failure.None;
    }

    /// <summary>
    /// Build a safe, unique, <see cref="CatalogMediaKey"/>-servable key for the
    /// upload. The filename is never trusted — the extension comes from the sniff
    /// and the leaf name is a fresh GUID, so uploads never collide or overwrite.
    /// </summary>
    public static string BuildKey(string kind, string? slug, string extension)
    {
        var folder = kind switch
        {
            KindCourseThumbnail => $"catalog/courses/{SanitizeSlug(slug)}/thumbnail",
            KindCourseHero => $"catalog/courses/{SanitizeSlug(slug)}/hero",
            KindLearningPathThumbnail => $"catalog/learning-paths/{SanitizeSlug(slug)}/thumbnail",
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown catalog media kind."),
        };

        var key = $"{folder}/{Guid.NewGuid():N}.{extension}";

        // Defence in depth: every segment we build is already safe, so this never
        // throws in practice — it guarantees the invariant if the shape changes.
        if (!CatalogMediaKey.TryResolve(key, out _, out _))
        {
            throw new InvalidOperationException("Generated catalog media key failed validation.");
        }

        return key;
    }

    /// <summary>Reduce arbitrary slug/context text to one safe path segment.</summary>
    public static string SanitizeSlug(string? slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) return "pending";

        var sb = new StringBuilder(slug.Length);
        foreach (var ch in slug.Trim().ToLowerInvariant())
        {
            if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) sb.Append(ch);
            else if (ch is '-' or ' ' or '_') sb.Append('-');
        }

        var cleaned = sb.ToString();
        while (cleaned.Contains("--", StringComparison.Ordinal))
        {
            cleaned = cleaned.Replace("--", "-");
        }
        cleaned = cleaned.Trim('-');
        if (cleaned.Length > 64) cleaned = cleaned[..64].Trim('-');

        return cleaned.Length == 0 ? "pending" : cleaned;
    }
}

/// <summary>
/// Response for a successful admin catalog-media upload: the generated storage
/// key (which the frontend resolves to a preview URL via the public media base),
/// its validated content type, and the stored size. Intentionally carries NO
/// URL and NO disk path.
/// </summary>
public sealed record CatalogMediaUploadResponse(string Key, string ContentType, long SizeBytes);

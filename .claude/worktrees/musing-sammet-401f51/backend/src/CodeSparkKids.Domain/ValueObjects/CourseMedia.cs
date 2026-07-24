namespace CodeSparkKids.Domain.ValueObjects;

/// <summary>
/// Media references for a course. Stores opaque storage keys (resolved to URLs
/// by the file-storage layer at read time) plus alt text and an optional promo
/// video URL. C1B introduces no upload feature — these are metadata only,
/// populated by seed data or future admin flows.
/// </summary>
public sealed class CourseMedia : IEquatable<CourseMedia>
{
    /// <summary>Storage key for the thumbnail image; <c>null</c> until set.</summary>
    public string? ThumbnailKey { get; private set; }

    /// <summary>Accessibility alt text for the thumbnail.</summary>
    public string? ThumbnailAlt { get; private set; }

    /// <summary>Optional storage key for a larger hero/banner image.</summary>
    public string? HeroKey { get; private set; }

    /// <summary>Optional URL to a promotional video.</summary>
    public string? PromoVideoUrl { get; private set; }

    private CourseMedia() { }

    private CourseMedia(string? thumbnailKey, string? thumbnailAlt, string? heroKey, string? promoVideoUrl)
    {
        ThumbnailKey = Trim(thumbnailKey);
        ThumbnailAlt = Trim(thumbnailAlt);
        HeroKey = Trim(heroKey);
        PromoVideoUrl = Trim(promoVideoUrl);
    }

    // A fresh instance per access: owned-entity instances must not be shared
    // across owners.
    public static CourseMedia Empty => new(null, null, null, null);

    public static CourseMedia Create(
        string? thumbnailKey,
        string? thumbnailAlt = null,
        string? heroKey = null,
        string? promoVideoUrl = null) =>
        new(thumbnailKey, thumbnailAlt, heroKey, promoVideoUrl);

    public bool HasThumbnail => !string.IsNullOrWhiteSpace(ThumbnailKey);

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public bool Equals(CourseMedia? other) =>
        other is not null &&
        ThumbnailKey == other.ThumbnailKey &&
        ThumbnailAlt == other.ThumbnailAlt &&
        HeroKey == other.HeroKey &&
        PromoVideoUrl == other.PromoVideoUrl;

    public override bool Equals(object? obj) => Equals(obj as CourseMedia);

    public override int GetHashCode() => HashCode.Combine(ThumbnailKey, ThumbnailAlt, HeroKey, PromoVideoUrl);
}

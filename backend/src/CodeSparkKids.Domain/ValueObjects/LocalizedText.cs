namespace CodeSparkKids.Domain.ValueObjects;

/// <summary>
/// Bilingual (English / Arabic) text value object used across the catalog for
/// titles, summaries, descriptions, category and learning-path names, and
/// outcomes. Stored relationally as two columns (En / Ar) by EF — see the
/// owned-type mappings in Infrastructure. Values are trimmed on creation;
/// either side may be empty (a course in draft may not yet have Arabic copy).
/// <para>
/// <see cref="Resolve"/> implements fallback: ask for a locale and you get that
/// language if present, otherwise the other language, otherwise empty string.
/// </para>
/// </summary>
public sealed class LocalizedText : IEquatable<LocalizedText>
{
    public string En { get; private set; } = string.Empty;
    public string Ar { get; private set; } = string.Empty;

    private LocalizedText() { }

    private LocalizedText(string en, string ar)
    {
        En = en;
        Ar = ar;
    }

    // A fresh instance per access: these are EF-owned entities, and one
    // instance must never be shared across owners (or across two owned
    // navigations on the same owner).
    public static LocalizedText Empty => new(string.Empty, string.Empty);

    public static LocalizedText Create(string? en, string? ar) =>
        new((en ?? string.Empty).Trim(), (ar ?? string.Empty).Trim());

    public bool HasEnglish => !string.IsNullOrWhiteSpace(En);
    public bool HasArabic => !string.IsNullOrWhiteSpace(Ar);

    /// <summary>True when both languages are populated (required to publish).</summary>
    public bool IsComplete => HasEnglish && HasArabic;

    /// <summary>True when at least one language is populated.</summary>
    public bool HasAny => HasEnglish || HasArabic;

    /// <summary>
    /// Returns the text for the requested locale, falling back to the other
    /// language when the requested one is empty. Any locale starting with
    /// "ar" (case-insensitive) is treated as Arabic; everything else English.
    /// </summary>
    public string Resolve(string? locale)
    {
        var wantArabic = locale is not null &&
                         locale.StartsWith("ar", StringComparison.OrdinalIgnoreCase);
        if (wantArabic)
            return HasArabic ? Ar : En;
        return HasEnglish ? En : Ar;
    }

    public bool Equals(LocalizedText? other) =>
        other is not null && En == other.En && Ar == other.Ar;

    public override bool Equals(object? obj) => Equals(obj as LocalizedText);

    public override int GetHashCode() => HashCode.Combine(En, Ar);

    public override string ToString() => HasEnglish ? En : Ar;
}

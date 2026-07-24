using CodeSparkKids.Domain.Catalog;

namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// A pre-commerce "I'm interested / contact me" lead raised from a public
/// catalog detail page. This is explicitly NOT enrollment: it grants no access,
/// creates no subscription, and takes no payment. It captures only the minimum
/// contact data needed for staff to follow up, plus which catalog item it came
/// from (by public slug + a title snapshot for display stability).
/// </summary>
public sealed class CatalogInterestLead
{
    public Guid Id { get; private set; }

    public CatalogInterestSourceType SourceType { get; private set; }

    /// <summary>Public slug of the course / learning path the lead is about.</summary>
    public string SourceSlug { get; private set; } = string.Empty;

    /// <summary>English title captured at submit time, so the admin view stays
    /// meaningful even if the item is later renamed or unpublished.</summary>
    public string? SourceTitleSnapshot { get; private set; }

    public string ParentName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public int? ChildAge { get; private set; }

    /// <summary>Preferred contact language, "en" or "ar" (nullable).</summary>
    public string? PreferredLanguage { get; private set; }

    public string? Notes { get; private set; }

    public CatalogInterestStatus Status { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? ContactedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }

    /// <summary>Free-text staff note (never shown publicly).</summary>
    public string? AdminNotes { get; private set; }

    private CatalogInterestLead() { }

    public static CatalogInterestLead Create(
        CatalogInterestSourceType sourceType,
        string sourceSlug,
        string? sourceTitleSnapshot,
        string parentName,
        string phone,
        string? email,
        int? childAge,
        string? preferredLanguage,
        string? notes,
        DateTime nowUtc) =>
        new()
        {
            Id = Guid.NewGuid(),
            SourceType = sourceType,
            SourceSlug = sourceSlug,
            SourceTitleSnapshot = Trim(sourceTitleSnapshot),
            ParentName = parentName.Trim(),
            Phone = phone.Trim(),
            Email = Trim(email),
            ChildAge = childAge,
            PreferredLanguage = Trim(preferredLanguage),
            Notes = Trim(notes),
            Status = CatalogInterestStatus.New,
            CreatedAt = nowUtc,
            UpdatedAt = nowUtc,
        };

    /// <summary>
    /// Move to the target status, stamping the matching timestamp. Idempotent —
    /// setting the current status only refreshes <see cref="UpdatedAt"/>. Never
    /// grants any access; this is a follow-up bookkeeping transition only.
    /// </summary>
    public void SetStatus(CatalogInterestStatus status, string? adminNotes, DateTime nowUtc)
    {
        Status = status;
        if (status == CatalogInterestStatus.Contacted && ContactedAt is null)
            ContactedAt = nowUtc;
        if (status == CatalogInterestStatus.Archived)
            ArchivedAt = nowUtc;
        if (status != CatalogInterestStatus.Archived)
            ArchivedAt = null;
        if (adminNotes is not null)
            AdminNotes = Trim(adminNotes);
        UpdatedAt = nowUtc;
    }

    private static string? Trim(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

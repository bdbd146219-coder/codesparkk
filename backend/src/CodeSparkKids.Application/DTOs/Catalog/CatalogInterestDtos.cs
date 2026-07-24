namespace CodeSparkKids.Application.DTOs.Catalog;

/// <summary>
/// Public "register interest" submission from a catalog detail page. No auth,
/// no file, no payment data — just enough contact info for staff to follow up.
/// <see cref="SourceType"/> is "course" or "learningPath"; <see cref="SourceSlug"/>
/// must resolve to a currently-published item.
/// </summary>
public sealed record CreateCatalogInterestRequest(
    string SourceType,
    string SourceSlug,
    string ParentName,
    string Phone,
    string? Email,
    int? ChildAge,
    string? PreferredLanguage,
    string? Notes);

/// <summary>
/// Public response — intentionally minimal. Confirms receipt with an id, the
/// (always "new") status, and the timestamp. Never echoes back the submitted
/// contact data.
/// </summary>
public sealed record CatalogInterestResponse(
    Guid Id,
    string Status,
    DateTime CreatedAtUtc);

/// <summary>Admin-facing view of a lead (staff-only endpoints).</summary>
public sealed record AdminCatalogInterestLeadDto(
    Guid Id,
    string SourceType,
    string SourceSlug,
    string? SourceTitle,
    string ParentName,
    string Phone,
    string? Email,
    int? ChildAge,
    string? PreferredLanguage,
    string? Notes,
    string Status,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    DateTime? ContactedAtUtc,
    DateTime? ArchivedAtUtc,
    string? AdminNotes);

/// <summary>Admin status transition. <see cref="Status"/> is "new",
/// "contacted", or "archived"; <see cref="AdminNotes"/> is optional.</summary>
public sealed record UpdateCatalogInterestStatusRequest(
    string Status,
    string? AdminNotes);

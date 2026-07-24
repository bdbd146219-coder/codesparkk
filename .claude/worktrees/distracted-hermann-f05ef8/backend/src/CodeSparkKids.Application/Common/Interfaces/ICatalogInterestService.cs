using CodeSparkKids.Application.DTOs.Catalog;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Pre-commerce catalog interest / lead capture (C4N). The public create path
/// validates the submission and confirms the source item is currently
/// published before storing a minimal contact lead — it grants no access,
/// creates no enrollment/subscription, and takes no payment. The admin paths
/// are staff-only review + a minimal status workflow.
/// </summary>
public interface ICatalogInterestService
{
    /// <summary>Create a lead from a public submission. Throws
    /// <see cref="Common.Catalog.CatalogException"/> (400/404) for invalid input
    /// or an unknown/unpublished source.</summary>
    Task<CatalogInterestResponse> CreateAsync(CreateCatalogInterestRequest request, CancellationToken ct);

    /// <summary>Admin: paged list of leads, optionally filtered by status.</summary>
    Task<PagedResult<AdminCatalogInterestLeadDto>> ListAsync(
        string? status, int? page, int? pageSize, CancellationToken ct);

    /// <summary>Admin: a single lead, or 404.</summary>
    Task<AdminCatalogInterestLeadDto> GetByIdAsync(Guid id, CancellationToken ct);

    /// <summary>Admin: transition status (new / contacted / archived).</summary>
    Task<AdminCatalogInterestLeadDto> UpdateStatusAsync(
        Guid id, UpdateCatalogInterestStatusRequest request, CancellationToken ct);
}

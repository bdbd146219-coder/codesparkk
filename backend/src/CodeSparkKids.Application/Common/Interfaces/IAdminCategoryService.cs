using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Application.DTOs.Catalog;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Authenticated, staff-only category management. Exposes active and inactive
/// categories with raw bilingual fields. No deletion in V1 — categories are
/// retired via deactivate/reactivate. Implemented in Infrastructure over EF Core.
/// </summary>
public interface IAdminCategoryService
{
    Task<PagedResult<AdminCategoryListItemDto>> ListAsync(AdminCategoryListQuery query, CancellationToken ct);

    /// <summary>Returns a category by id, or throws 404
    /// <see cref="Common.Catalog.CatalogException"/> when unknown.</summary>
    Task<AdminCategoryDetailDto> GetByIdAsync(Guid id, CancellationToken ct);

    Task<CreateCategoryResponse> CreateAsync(CreateCategoryRequest request, RequestContext ctx, CancellationToken ct);

    Task<AdminCategoryDetailDto> UpdateAsync(Guid id, UpdateCategoryRequest request, RequestContext ctx, CancellationToken ct);

    Task<AdminCategoryDetailDto> ActivateAsync(Guid id, CategoryLifecycleRequest request, RequestContext ctx, CancellationToken ct);

    Task<AdminCategoryDetailDto> DeactivateAsync(Guid id, CategoryLifecycleRequest request, RequestContext ctx, CancellationToken ct);
}

using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Application.DTOs.Catalog;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Authenticated, staff-only read access to courses for management. Unlike
/// <see cref="ICatalogService"/>, this exposes every non-deleted state
/// (Draft/InReview/Published/Archived, listed or not) and returns raw bilingual
/// fields. C1C.1 is read-only; create/update/lifecycle land in later slices.
/// </summary>
public interface IAdminCourseService
{
    Task<PagedResult<AdminCourseListItemDto>> ListAsync(AdminCourseListQuery query, CancellationToken ct);

    /// <summary>
    /// Returns full editor-read data for a course by id, or throws
    /// <see cref="Common.Catalog.CatalogException"/> 404 when the id is unknown
    /// (or soft-deleted).
    /// </summary>
    Task<AdminCourseDetailDto> GetByIdAsync(Guid id, CancellationToken ct);

    /// <summary>Creates a draft course. Throws <see cref="Common.Catalog.CatalogException"/>
    /// for slug conflicts (409), missing category (404), or invalid input (400).</summary>
    Task<CreateCourseResponse> CreateAsync(CreateCourseRequest request, RequestContext ctx, CancellationToken ct);

    /// <summary>Updates course-level fields with explicit rowVersion concurrency.
    /// Throws for not found (404), archived/invalid state (400), stale rowVersion
    /// (409), slug conflict (409), or missing category (404).</summary>
    Task<AdminCourseDetailDto> UpdateAsync(Guid id, UpdateCourseRequest request, RequestContext ctx, CancellationToken ct);

    /// <summary>Publishes a course. Throws 422 <see cref="Common.Catalog.CatalogException"/>
    /// (with the readiness checklist) when not ready, 409 on stale rowVersion, 404 if unknown.</summary>
    Task<LifecycleResponseDto> PublishAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct);

    Task<LifecycleResponseDto> UnpublishAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct);

    Task<LifecycleResponseDto> ArchiveAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct);

    Task<LifecycleResponseDto> RestoreAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct);

    // --- Modules (return a fresh editor snapshot) --------------------------
    Task<AdminCourseDetailDto> AddModuleAsync(Guid id, AddModuleRequest request, RequestContext ctx, CancellationToken ct);
    Task<AdminCourseDetailDto> UpdateModuleAsync(Guid id, Guid moduleId, UpdateModuleRequest request, RequestContext ctx, CancellationToken ct);
    Task<AdminCourseDetailDto> RemoveModuleAsync(Guid id, Guid moduleId, LifecycleRequest request, RequestContext ctx, CancellationToken ct);
    Task<AdminCourseDetailDto> ReorderModulesAsync(Guid id, ReorderModulesRequest request, RequestContext ctx, CancellationToken ct);

    // --- Instructors -------------------------------------------------------
    Task<AdminCourseDetailDto> AssignInstructorAsync(Guid id, AssignInstructorRequest request, RequestContext ctx, CancellationToken ct);
    Task<AdminCourseDetailDto> RemoveInstructorAsync(Guid id, Guid instructorUserId, LifecycleRequest request, RequestContext ctx, CancellationToken ct);
}

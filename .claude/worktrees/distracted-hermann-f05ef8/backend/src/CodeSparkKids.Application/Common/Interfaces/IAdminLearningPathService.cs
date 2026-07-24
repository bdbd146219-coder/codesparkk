using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Application.DTOs.Catalog;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Authenticated, staff-only learning-path management. Exposes every non-deleted
/// state with raw bilingual fields and a read-only item list. Item mutation is
/// deferred to a later slice. No deletion in V1 — paths are archived/restored.
/// </summary>
public interface IAdminLearningPathService
{
    Task<PagedResult<AdminLearningPathListItemDto>> ListAsync(AdminLearningPathListQuery query, CancellationToken ct);

    Task<AdminLearningPathDetailDto> GetByIdAsync(Guid id, CancellationToken ct);

    Task<CreateLearningPathResponse> CreateAsync(CreateLearningPathRequest request, RequestContext ctx, CancellationToken ct);

    Task<AdminLearningPathDetailDto> UpdateAsync(Guid id, UpdateLearningPathRequest request, RequestContext ctx, CancellationToken ct);

    /// <summary>Publishes a path; throws 422 with the readiness checklist when not ready.</summary>
    Task<LearningPathLifecycleResponseDto> PublishAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct);

    Task<LearningPathLifecycleResponseDto> UnpublishAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct);

    Task<LearningPathLifecycleResponseDto> ArchiveAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct);

    Task<LearningPathLifecycleResponseDto> RestoreAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct);

    // --- Items (return a fresh editor snapshot) ----------------------------
    Task<AdminLearningPathDetailDto> AddItemAsync(Guid id, AddLearningPathItemRequest request, RequestContext ctx, CancellationToken ct);
    Task<AdminLearningPathDetailDto> RemoveItemAsync(Guid id, Guid itemId, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct);
    Task<AdminLearningPathDetailDto> ReorderItemsAsync(Guid id, ReorderLearningPathItemsRequest request, RequestContext ctx, CancellationToken ct);
}

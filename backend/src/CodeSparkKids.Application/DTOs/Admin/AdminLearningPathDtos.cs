namespace CodeSparkKids.Application.DTOs.Admin;

/// <summary>
/// Query/filter inputs for the admin learning-path list. Shows every non-deleted
/// state; raw bilingual fields, so no <c>lang</c> parameter.
/// </summary>
public sealed record AdminLearningPathListQuery(
    string? Q = null,
    string? Status = null,
    string? AgeBand = null,
    bool? IsListed = null,
    string? Sort = null,
    int? Page = null,
    int? PageSize = null);

public sealed record AdminLearningPathMediaDto(
    string? ThumbnailKey,
    string? ThumbnailAlt,
    string? HeroKey,
    string? PromoVideoUrl);

/// <summary>Read-only item view for the editor (item mutation is deferred to C1C.5C).</summary>
public sealed record AdminLearningPathItemDto(
    Guid Id,
    Guid CourseId,
    int Order,
    string? Note,
    string? CourseSlug,
    string? CourseTitleEn,
    string? CoursePublishState);

public sealed record LearningPathReadinessItemDto(string Code, string MessageKey, bool Satisfied, string? Message = null);

public sealed record LearningPathReadinessDto(bool IsReady, IReadOnlyList<LearningPathReadinessItemDto> Items);

public sealed record AdminLearningPathListItemDto(
    Guid Id,
    string Slug,
    string TitleEn,
    string TitleAr,
    string AgeBand,
    string PublishState,
    bool IsListed,
    int ItemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    string RowVersion);

public sealed record AdminLearningPathDetailDto(
    Guid Id,
    string Slug,
    string TitleEn,
    string TitleAr,
    string SummaryEn,
    string SummaryAr,
    string AgeBand,
    string PublishState,
    bool IsListed,
    AdminLearningPathMediaDto Media,
    IReadOnlyList<AdminLearningPathItemDto> Items,
    LearningPathReadinessDto Readiness,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    DateTime? DeletedAt,
    string RowVersion);

public sealed record CreateLearningPathRequest(
    string TitleEn,
    string? TitleAr,
    string? SummaryEn,
    string? SummaryAr,
    string AgeBand,
    string? Slug,
    AdminLearningPathMediaDto? Media);

public sealed record CreateLearningPathResponse(Guid Id, string Slug, string PublishState, string RowVersion);

public sealed record UpdateLearningPathRequest(
    string RowVersion,
    string? Slug,
    string TitleEn,
    string? TitleAr,
    string? SummaryEn,
    string? SummaryAr,
    string AgeBand,
    bool IsListed,
    AdminLearningPathMediaDto? Media);

/// <summary>Body for learning-path lifecycle transitions and item removal — only the concurrency token.</summary>
public sealed record LearningPathLifecycleRequest(string RowVersion);

// --- Items -----------------------------------------------------------------

public sealed record AddLearningPathItemRequest(string RowVersion, Guid CourseId, string? Note);

public sealed record ReorderLearningPathItemsRequest(string RowVersion, IReadOnlyList<Guid> OrderedItemIds);

public sealed record LearningPathLifecycleResponseDto(
    Guid Id,
    string PublishState,
    bool IsListed,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    string RowVersion);

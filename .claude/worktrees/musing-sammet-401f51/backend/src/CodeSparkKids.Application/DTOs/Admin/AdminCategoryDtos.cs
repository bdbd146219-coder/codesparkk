namespace CodeSparkKids.Application.DTOs.Admin;

/// <summary>
/// Query/filter inputs for the admin category list. Shows every state (active +
/// inactive); raw bilingual fields, so no <c>lang</c> parameter.
/// </summary>
public sealed record AdminCategoryListQuery(
    string? Q = null,
    bool? IsActive = null,
    string? Sort = null,
    int? Page = null,
    int? PageSize = null);

public sealed record AdminCategoryListItemDto(
    Guid Id,
    string Slug,
    string NameEn,
    string NameAr,
    string? Icon,
    int Order,
    bool IsActive,
    int PublishedCourseCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string RowVersion);

public sealed record AdminCategoryDetailDto(
    Guid Id,
    string Slug,
    string NameEn,
    string NameAr,
    string DescriptionEn,
    string DescriptionAr,
    string? Icon,
    int Order,
    bool IsActive,
    int PublishedCourseCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string RowVersion);

public sealed record CreateCategoryRequest(
    string NameEn,
    string? NameAr,
    string? DescriptionEn,
    string? DescriptionAr,
    string? Icon,
    int? Order,
    string? Slug);

public sealed record CreateCategoryResponse(Guid Id, string Slug, bool IsActive, string RowVersion);

public sealed record UpdateCategoryRequest(
    string RowVersion,
    string? Slug,
    string NameEn,
    string? NameAr,
    string? DescriptionEn,
    string? DescriptionAr,
    string? Icon,
    int Order);

/// <summary>Body for category activate/deactivate — only the concurrency token.</summary>
public sealed record CategoryLifecycleRequest(string RowVersion);

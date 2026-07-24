namespace CodeSparkKids.Application.DTOs.Catalog;

/// <summary>Generic paged envelope for list endpoints.</summary>
public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

// --- Query inputs (bound from the query string by the controller) ----------

public sealed record CourseCatalogQuery(
    string? Lang = null,
    string? Q = null,
    string? AgeBand = null,
    int? Age = null,
    string? DeliveryType = null,
    string? Difficulty = null,
    string? Category = null,
    string? Sort = null,
    int? Page = null,
    int? PageSize = null);

public sealed record LearningPathQuery(
    string? Lang = null,
    string? AgeBand = null,
    int? Page = null,
    int? PageSize = null);

// --- Shared sub-DTOs -------------------------------------------------------

public sealed record CategoryRefDto(string Slug, string Name);

public sealed record CatalogInstructorDto(Guid InstructorUserId, string Role);

public sealed record CatalogPricingDto(string Model, decimal? Amount, string? Currency);

public sealed record CourseModulePreviewDto(string Title, string Summary, int Order);

// --- Course DTOs -----------------------------------------------------------

public sealed record CourseCardDto(
    string Slug,
    string Title,
    string Subtitle,
    string Summary,
    string AgeBand,
    int MinAge,
    int MaxAge,
    string DeliveryType,
    string Difficulty,
    CategoryRefDto? Category,
    string? ThumbnailKey,
    string? ThumbnailAlt,
    IReadOnlyList<CatalogInstructorDto> Instructors,
    CatalogPricingDto Pricing,
    IReadOnlyList<string> OutcomesPreview);

public sealed record CourseDetailDto(
    string Slug,
    string Title,
    string Subtitle,
    string Summary,
    string Description,
    string AgeBand,
    int MinAge,
    int MaxAge,
    string DeliveryType,
    string Difficulty,
    CategoryRefDto? Category,
    string? ThumbnailKey,
    string? ThumbnailAlt,
    string? HeroKey,
    string? PromoVideoUrl,
    IReadOnlyList<CatalogInstructorDto> Instructors,
    CatalogPricingDto Pricing,
    IReadOnlyList<string> Outcomes,
    IReadOnlyList<CourseModulePreviewDto> ModulesPreview,
    IReadOnlyList<string> AvailableLocales);

// --- Category DTO ----------------------------------------------------------

public sealed record CategoryDto(
    string Slug,
    string Name,
    string Description,
    string? Icon,
    int Order,
    int PublishedCourseCount);

// --- Learning path DTOs ----------------------------------------------------

public sealed record LearningPathCardDto(
    string Slug,
    string Title,
    string Summary,
    string AgeBand,
    int CourseCount,
    string? ThumbnailKey,
    string? ThumbnailAlt);

public sealed record LearningPathDetailDto(
    string Slug,
    string Title,
    string Summary,
    string AgeBand,
    string? ThumbnailKey,
    string? ThumbnailAlt,
    IReadOnlyList<CourseCardDto> Courses);

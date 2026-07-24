namespace CodeSparkKids.Application.DTOs.Admin;

// --- Query input -----------------------------------------------------------

/// <summary>
/// Query/filter inputs for the admin course list. Unlike the public catalog,
/// admin shows every non-deleted state and returns raw bilingual fields, so
/// there is no <c>lang</c> parameter.
/// </summary>
public sealed record AdminCourseListQuery(
    string? Q = null,
    string? Status = null,
    string? DeliveryType = null,
    string? Difficulty = null,
    string? AgeBand = null,
    string? Category = null,
    bool? IsListed = null,
    string? Sort = null,
    int? Page = null,
    int? PageSize = null);

// --- Shared sub-DTOs -------------------------------------------------------

/// <summary>Raw (unlocalized) category reference for admin surfaces.</summary>
public sealed record AdminCategoryRefDto(Guid Id, string Slug, string NameEn, string NameAr);

public sealed record AdminPricingDto(string Model, decimal? Amount, string? Currency);

public sealed record AdminMediaDto(
    string? ThumbnailKey,
    string? ThumbnailAlt,
    string? HeroKey,
    string? PromoVideoUrl);

public sealed record AdminOutcomeDto(string TextEn, string TextAr, int Order);

public sealed record AdminModuleDto(
    Guid Id,
    string TitleEn,
    string TitleAr,
    string SummaryEn,
    string SummaryAr,
    int Order);

public sealed record AdminInstructorDto(Guid InstructorUserId, string Role);

/// <summary>
/// A single publish-checklist requirement. <see cref="Code"/> is a stable,
/// presentation-agnostic identifier (e.g. "thumbnail-missing");
/// <see cref="MessageKey"/> is the i18n key the frontend renders;
/// <see cref="Message"/> is an English fallback. Items currently represent UNMET
/// requirements (<see cref="Satisfied"/> = false).
/// </summary>
public sealed record PublishReadinessItemDto(string Code, string MessageKey, bool Satisfied, string? Message = null);

public sealed record PublishReadinessDto(bool IsReady, IReadOnlyList<PublishReadinessItemDto> Items);

// --- List + detail ---------------------------------------------------------

public sealed record AdminCourseListItemDto(
    Guid Id,
    string Slug,
    string TitleEn,
    string TitleAr,
    string PublishState,
    bool IsListed,
    string DeliveryType,
    string Difficulty,
    string AgeBand,
    int MinAge,
    int MaxAge,
    AdminCategoryRefDto? Category,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    string RowVersion);

public sealed record AdminCourseDetailDto(
    Guid Id,
    string Slug,
    string TitleEn,
    string TitleAr,
    string SubtitleEn,
    string SubtitleAr,
    string SummaryEn,
    string SummaryAr,
    string DescriptionEn,
    string DescriptionAr,
    string DeliveryType,
    string Difficulty,
    string AgeBand,
    int MinAge,
    int MaxAge,
    string PublishState,
    bool IsListed,
    Guid PrimaryCategoryId,
    AdminCategoryRefDto? Category,
    AdminPricingDto Pricing,
    AdminMediaDto Media,
    IReadOnlyList<AdminOutcomeDto> Outcomes,
    IReadOnlyList<AdminModuleDto> Modules,
    IReadOnlyList<AdminInstructorDto> Instructors,
    PublishReadinessDto PublishReadiness,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    DateTime? DeletedAt,
    string RowVersion);

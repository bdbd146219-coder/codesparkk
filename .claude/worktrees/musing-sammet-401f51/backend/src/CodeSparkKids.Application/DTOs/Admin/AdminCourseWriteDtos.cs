namespace CodeSparkKids.Application.DTOs.Admin;

/// <summary>
/// Create a draft course. Enum-shaped fields are sent as strings (e.g.
/// "Recorded") and parsed server-side, mirroring the read DTOs. Mandatory
/// fields follow <c>Course.Create</c>'s invariants; <see cref="Slug"/> is
/// derived from <see cref="TitleEn"/> when omitted.
/// </summary>
public sealed record CreateCourseRequest(
    string TitleEn,
    string? TitleAr,
    string? Slug,
    Guid PrimaryCategoryId,
    string DeliveryType,
    string Difficulty,
    string AgeBand,
    int MinAge,
    int MaxAge);

public sealed record CreateCourseResponse(
    Guid Id,
    string Slug,
    string PublishState,
    string RowVersion);

public sealed record UpdateCoursePricingDto(string Model, decimal? Amount, string? Currency);

public sealed record UpdateCourseMediaDto(
    string? ThumbnailKey,
    string? ThumbnailAlt,
    string? HeroKey,
    string? PromoVideoUrl);

public sealed record UpdateCourseOutcomeDto(string TextEn, string TextAr);

/// <summary>
/// Update course-level editor fields. <see cref="RowVersion"/> (base64) is
/// required and compared against the stored token before any mutation. Modules
/// and instructors are NOT updated here.
/// </summary>
/// <summary>Body for lifecycle transitions and child removals — only the concurrency token.</summary>
public sealed record LifecycleRequest(string RowVersion);

// --- Modules ---------------------------------------------------------------

public sealed record AddModuleRequest(
    string RowVersion,
    string TitleEn,
    string? TitleAr,
    string? SummaryEn,
    string? SummaryAr);

public sealed record UpdateModuleRequest(
    string RowVersion,
    string TitleEn,
    string? TitleAr,
    string? SummaryEn,
    string? SummaryAr);

public sealed record ReorderModulesRequest(string RowVersion, IReadOnlyList<Guid> OrderedModuleIds);

// --- Instructors -----------------------------------------------------------

public sealed record AssignInstructorRequest(string RowVersion, Guid InstructorUserId, string RoleOnCourse);

/// <summary>Lifecycle transition result with the post-transition state + new token.</summary>
public sealed record LifecycleResponseDto(
    Guid Id,
    string PublishState,
    bool IsListed,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    string RowVersion);

public sealed record UpdateCourseRequest(
    string RowVersion,
    string? Slug,
    string TitleEn,
    string? TitleAr,
    string? SubtitleEn,
    string? SubtitleAr,
    string? SummaryEn,
    string? SummaryAr,
    string? DescriptionEn,
    string? DescriptionAr,
    string DeliveryType,
    string Difficulty,
    string AgeBand,
    int MinAge,
    int MaxAge,
    Guid PrimaryCategoryId,
    bool IsListed,
    UpdateCoursePricingDto? Pricing,
    UpdateCourseMediaDto? Media,
    IReadOnlyList<UpdateCourseOutcomeDto>? Outcomes);

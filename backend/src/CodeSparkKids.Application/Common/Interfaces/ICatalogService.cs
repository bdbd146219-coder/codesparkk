using CodeSparkKids.Application.DTOs.Catalog;

namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Read-only public catalog queries over the course domain. All methods return
/// localized DTOs and only ever expose published content; hidden states
/// (draft/in-review/archived/soft-deleted) are invisible here. Implemented in
/// Infrastructure against EF Core.
/// </summary>
public interface ICatalogService
{
    Task<PagedResult<CourseCardDto>> GetCoursesAsync(
        CourseCatalogQuery query, string? acceptLanguage, CancellationToken ct);

    /// <summary>
    /// Returns a published course (listed or unlisted) by slug, or throws
    /// <see cref="Common.Catalog.CatalogException"/> with a 404 for any
    /// non-published/unknown slug.
    /// </summary>
    Task<CourseDetailDto> GetCourseBySlugAsync(
        string slug, string? lang, string? acceptLanguage, CancellationToken ct);

    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(
        string? lang, string? acceptLanguage, CancellationToken ct);

    Task<PagedResult<LearningPathCardDto>> GetLearningPathsAsync(
        LearningPathQuery query, string? acceptLanguage, CancellationToken ct);

    Task<LearningPathDetailDto> GetLearningPathBySlugAsync(
        string slug, string? lang, string? acceptLanguage, CancellationToken ct);
}

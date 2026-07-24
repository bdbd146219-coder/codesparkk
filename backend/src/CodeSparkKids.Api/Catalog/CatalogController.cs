using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Catalog;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Catalog;

/// <summary>
/// Read-only public catalog API. No authentication: every response is derived
/// only from published content. All endpoints are safe to cache.
/// </summary>
[ApiController]
[Route("api/v1/catalog")]
[Tags("Catalog")]
[Produces("application/json")]
public sealed class CatalogController(ICatalogService catalog) : ControllerBase
{
    [HttpGet("courses")]
    [ProducesResponseType(typeof(PagedResult<CourseCardDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetCourses(
        [FromQuery] string? lang,
        [FromQuery] string? q,
        [FromQuery] string? ageBand,
        [FromQuery] int? age,
        [FromQuery] string? deliveryType,
        [FromQuery] string? difficulty,
        [FromQuery] string? category,
        [FromQuery] string? sort,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        var query = new CourseCatalogQuery(lang, q, ageBand, age, deliveryType, difficulty, category, sort, page, pageSize);
        var result = await catalog.GetCoursesAsync(query, AcceptLanguage, ct);
        return Ok(result);
    }

    [HttpGet("courses/{slug}")]
    [ProducesResponseType(typeof(CourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourse(string slug, [FromQuery] string? lang, CancellationToken ct)
    {
        var result = await catalog.GetCourseBySlugAsync(slug, lang, AcceptLanguage, ct);
        return Ok(result);
    }

    [HttpGet("categories")]
    [ProducesResponseType(typeof(IReadOnlyList<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories([FromQuery] string? lang, CancellationToken ct)
    {
        var result = await catalog.GetCategoriesAsync(lang, AcceptLanguage, ct);
        return Ok(result);
    }

    [HttpGet("learning-paths")]
    [ProducesResponseType(typeof(PagedResult<LearningPathCardDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetLearningPaths(
        [FromQuery] string? lang,
        [FromQuery] string? ageBand,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        var query = new LearningPathQuery(lang, ageBand, page, pageSize);
        var result = await catalog.GetLearningPathsAsync(query, AcceptLanguage, ct);
        return Ok(result);
    }

    [HttpGet("learning-paths/{slug}")]
    [ProducesResponseType(typeof(LearningPathDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLearningPath(string slug, [FromQuery] string? lang, CancellationToken ct)
    {
        var result = await catalog.GetLearningPathBySlugAsync(slug, lang, AcceptLanguage, ct);
        return Ok(result);
    }

    private string? AcceptLanguage => Request.Headers.AcceptLanguage.ToString();
}

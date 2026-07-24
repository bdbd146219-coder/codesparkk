using CodeSparkKids.Api.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Application.DTOs.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Catalog;

/// <summary>
/// Authenticated, staff-only read API for course management. Requires the
/// <see cref="CoursePolicies.ViewDrafts"/> policy (Admin/SuperAdmin in V1).
/// Read-only in C1C.1 — create/update/lifecycle arrive in later slices.
/// </summary>
[ApiController]
[Route("api/v1/admin/courses")]
[Tags("Admin Courses")]
[Produces("application/json")]
[Authorize(Policy = CoursePolicies.ViewDrafts)]
public sealed class AdminCourseController(IAdminCourseService courses) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminCourseListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] string? deliveryType,
        [FromQuery] string? difficulty,
        [FromQuery] string? ageBand,
        [FromQuery] string? category,
        [FromQuery] bool? isListed,
        [FromQuery] string? sort,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        var query = new AdminCourseListQuery(q, status, deliveryType, difficulty, ageBand, category, isListed, sort, page, pageSize);
        var result = await courses.ListAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await courses.GetByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(CreateCourseResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateCourseRequest request, CancellationToken ct)
    {
        var result = await courses.CreateAsync(request, Context(), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCourseRequest request, CancellationToken ct)
    {
        var result = await courses.UpdateAsync(id, request, Context(), ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Policy = CoursePolicies.Publish)]
    [ProducesResponseType(typeof(LifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Publish(Guid id, [FromBody] LifecycleRequest request, CancellationToken ct) =>
        Ok(await courses.PublishAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Policy = CoursePolicies.Publish)]
    [ProducesResponseType(typeof(LifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Unpublish(Guid id, [FromBody] LifecycleRequest request, CancellationToken ct) =>
        Ok(await courses.UnpublishAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/archive")]
    [Authorize(Policy = CoursePolicies.Archive)]
    [ProducesResponseType(typeof(LifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Archive(Guid id, [FromBody] LifecycleRequest request, CancellationToken ct) =>
        Ok(await courses.ArchiveAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/restore")]
    [Authorize(Policy = CoursePolicies.Archive)]
    [ProducesResponseType(typeof(LifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Restore(Guid id, [FromBody] LifecycleRequest request, CancellationToken ct) =>
        Ok(await courses.RestoreAsync(id, request, Context(), ct));

    // --- Modules -----------------------------------------------------------

    [HttpPost("{id:guid}/modules")]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddModule(Guid id, [FromBody] AddModuleRequest request, CancellationToken ct) =>
        Ok(await courses.AddModuleAsync(id, request, Context(), ct));

    [HttpPut("{id:guid}/modules/{moduleId:guid}")]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateModule(Guid id, Guid moduleId, [FromBody] UpdateModuleRequest request, CancellationToken ct) =>
        Ok(await courses.UpdateModuleAsync(id, moduleId, request, Context(), ct));

    [HttpPost("{id:guid}/modules/{moduleId:guid}/remove")]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveModule(Guid id, Guid moduleId, [FromBody] LifecycleRequest request, CancellationToken ct) =>
        Ok(await courses.RemoveModuleAsync(id, moduleId, request, Context(), ct));

    [HttpPost("{id:guid}/modules/reorder")]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ReorderModules(Guid id, [FromBody] ReorderModulesRequest request, CancellationToken ct) =>
        Ok(await courses.ReorderModulesAsync(id, request, Context(), ct));

    // --- Instructors -------------------------------------------------------

    [HttpPost("{id:guid}/instructors")]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignInstructor(Guid id, [FromBody] AssignInstructorRequest request, CancellationToken ct) =>
        Ok(await courses.AssignInstructorAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/instructors/{instructorUserId:guid}/remove")]
    [Authorize(Policy = CoursePolicies.Manage)]
    [ProducesResponseType(typeof(AdminCourseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveInstructor(Guid id, Guid instructorUserId, [FromBody] LifecycleRequest request, CancellationToken ct) =>
        Ok(await courses.RemoveInstructorAsync(id, instructorUserId, request, Context(), ct));

    private RequestContext Context() => new(
        HttpContext.Connection.RemoteIpAddress?.ToString(),
        Request.Headers.UserAgent.ToString());
}

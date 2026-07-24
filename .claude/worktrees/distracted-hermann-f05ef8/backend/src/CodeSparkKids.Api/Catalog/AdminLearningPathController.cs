using CodeSparkKids.Api.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Application.DTOs.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Catalog;

/// <summary>
/// Authenticated, staff-only learning-path management. Read/CRUD require
/// LearningPaths.Manage; publish/unpublish require LearningPaths.Publish;
/// archive/restore require LearningPaths.Archive (all Admin/SuperAdmin in V1).
/// Item mutation is a later slice; items are read-only here.
/// </summary>
[ApiController]
[Route("api/v1/admin/learning-paths")]
[Tags("Admin Learning Paths")]
[Produces("application/json")]
[Authorize(Policy = CoursePolicies.LearningPathsManage)]
public sealed class AdminLearningPathController(IAdminLearningPathService paths) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminLearningPathListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] string? ageBand,
        [FromQuery] bool? isListed,
        [FromQuery] string? sort,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        var query = new AdminLearningPathListQuery(q, status, ageBand, isListed, sort, page, pageSize);
        return Ok(await paths.ListAsync(query, ct));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminLearningPathDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        Ok(await paths.GetByIdAsync(id, ct));

    [HttpPost]
    [ProducesResponseType(typeof(CreateLearningPathResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateLearningPathRequest request, CancellationToken ct)
    {
        var result = await paths.CreateAsync(request, Context(), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AdminLearningPathDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateLearningPathRequest request, CancellationToken ct) =>
        Ok(await paths.UpdateAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/publish")]
    [Authorize(Policy = CoursePolicies.LearningPathsPublish)]
    [ProducesResponseType(typeof(LearningPathLifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Publish(Guid id, [FromBody] LearningPathLifecycleRequest request, CancellationToken ct) =>
        Ok(await paths.PublishAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Policy = CoursePolicies.LearningPathsPublish)]
    [ProducesResponseType(typeof(LearningPathLifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Unpublish(Guid id, [FromBody] LearningPathLifecycleRequest request, CancellationToken ct) =>
        Ok(await paths.UnpublishAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/archive")]
    [Authorize(Policy = CoursePolicies.LearningPathsArchive)]
    [ProducesResponseType(typeof(LearningPathLifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Archive(Guid id, [FromBody] LearningPathLifecycleRequest request, CancellationToken ct) =>
        Ok(await paths.ArchiveAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/restore")]
    [Authorize(Policy = CoursePolicies.LearningPathsArchive)]
    [ProducesResponseType(typeof(LearningPathLifecycleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Restore(Guid id, [FromBody] LearningPathLifecycleRequest request, CancellationToken ct) =>
        Ok(await paths.RestoreAsync(id, request, Context(), ct));

    // --- Items -------------------------------------------------------------

    [HttpPost("{id:guid}/items")]
    [ProducesResponseType(typeof(AdminLearningPathDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddItem(Guid id, [FromBody] AddLearningPathItemRequest request, CancellationToken ct) =>
        Ok(await paths.AddItemAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/items/{itemId:guid}/remove")]
    [ProducesResponseType(typeof(AdminLearningPathDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveItem(Guid id, Guid itemId, [FromBody] LearningPathLifecycleRequest request, CancellationToken ct) =>
        Ok(await paths.RemoveItemAsync(id, itemId, request, Context(), ct));

    [HttpPost("{id:guid}/items/reorder")]
    [ProducesResponseType(typeof(AdminLearningPathDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ReorderItems(Guid id, [FromBody] ReorderLearningPathItemsRequest request, CancellationToken ct) =>
        Ok(await paths.ReorderItemsAsync(id, request, Context(), ct));

    private RequestContext Context() => new(
        HttpContext.Connection.RemoteIpAddress?.ToString(),
        Request.Headers.UserAgent.ToString());
}

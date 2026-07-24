using CodeSparkKids.Api.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Application.DTOs.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Catalog;

/// <summary>
/// Authenticated, staff-only category management (Categories.Manage =
/// Admin/SuperAdmin in V1). Shows active and inactive categories with raw
/// bilingual fields. No deletion — categories are retired via deactivate.
/// </summary>
[ApiController]
[Route("api/v1/admin/categories")]
[Tags("Admin Categories")]
[Produces("application/json")]
[Authorize(Policy = CoursePolicies.CategoriesManage)]
public sealed class AdminCategoryController(IAdminCategoryService categories) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminCategoryListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] bool? isActive,
        [FromQuery] string? sort,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        var query = new AdminCategoryListQuery(q, isActive, sort, page, pageSize);
        return Ok(await categories.ListAsync(query, ct));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminCategoryDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        Ok(await categories.GetByIdAsync(id, ct));

    [HttpPost]
    [ProducesResponseType(typeof(CreateCategoryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var result = await categories.CreateAsync(request, Context(), ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AdminCategoryDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryRequest request, CancellationToken ct) =>
        Ok(await categories.UpdateAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/activate")]
    [ProducesResponseType(typeof(AdminCategoryDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Activate(Guid id, [FromBody] CategoryLifecycleRequest request, CancellationToken ct) =>
        Ok(await categories.ActivateAsync(id, request, Context(), ct));

    [HttpPost("{id:guid}/deactivate")]
    [ProducesResponseType(typeof(AdminCategoryDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Deactivate(Guid id, [FromBody] CategoryLifecycleRequest request, CancellationToken ct) =>
        Ok(await categories.DeactivateAsync(id, request, Context(), ct));

    private RequestContext Context() => new(
        HttpContext.Connection.RemoteIpAddress?.ToString(),
        Request.Headers.UserAgent.ToString());
}

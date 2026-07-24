using CodeSparkKids.Api.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Catalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Catalog;

/// <summary>
/// Staff-only review of catalog interest leads (Admin / SuperAdmin via
/// <see cref="CoursePolicies.Manage"/>). Read + a minimal status workflow
/// (new → contacted → archived). No public access, no deletion, no export.
/// </summary>
[ApiController]
[Route("api/v1/admin/catalog/interests")]
[Tags("Admin Catalog Interest")]
[Produces("application/json")]
[Authorize(Policy = CoursePolicies.Manage)]
public sealed class AdminCatalogInterestController(ICatalogInterestService interest) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminCatalogInterestLeadDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct) =>
        Ok(await interest.ListAsync(status, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminCatalogInterestLeadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        Ok(await interest.GetByIdAsync(id, ct));

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(AdminCatalogInterestLeadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        Guid id, [FromBody] UpdateCatalogInterestStatusRequest request, CancellationToken ct) =>
        Ok(await interest.UpdateStatusAsync(id, request, ct));
}

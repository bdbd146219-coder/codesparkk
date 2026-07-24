using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Catalog;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CodeSparkKids.Api.Catalog;

/// <summary>
/// Public, unauthenticated pre-commerce interest capture. A visitor on a
/// published course / learning-path detail page can leave contact details so
/// staff can follow up when enrollment opens. This grants NO access, creates
/// NO enrollment/subscription, and takes NO payment. Rate-limited per IP.
/// </summary>
[ApiController]
[Route("api/v1/catalog/interest")]
[Tags("Catalog Interest")]
[Produces("application/json")]
public sealed class CatalogInterestController(ICatalogInterestService interest) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("catalog-interest")]
    [ProducesResponseType(typeof(CatalogInterestResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create([FromBody] CreateCatalogInterestRequest request, CancellationToken ct)
    {
        var result = await interest.CreateAsync(request, ct);
        // 201 with the minimal receipt; no Location — leads are not publicly readable.
        return StatusCode(StatusCodes.Status201Created, result);
    }
}

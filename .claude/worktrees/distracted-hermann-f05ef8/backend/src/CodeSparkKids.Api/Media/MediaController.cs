using CodeSparkKids.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace CodeSparkKids.Api.Media;

/// <summary>
/// Public, read-only catalog media (thumbnails / heroes). Serves only
/// allow-listed image types from the configured storage root, addressed by an
/// opaque storage key (e.g. <c>courses/python/thumb.png</c>). Unsafe,
/// unsupported, and missing keys all return 404, so the endpoint cannot be used
/// to probe the filesystem. No authentication: only published catalog images
/// are ever placed under this root, and nothing else is served.
/// </summary>
[ApiController]
[Route("api/v1/media")]
[Tags("Media")]
public sealed class MediaController(ICatalogMediaStore media) : ControllerBase
{
    /// <summary>Stream a catalog media image by storage key.</summary>
    [HttpGet("{**key}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string key, CancellationToken ct)
    {
        var file = await media.OpenAsync(key, ct);
        if (file is null)
        {
            return NotFound();
        }

        // Never let the browser second-guess our validated content type.
        Response.Headers[HeaderNames.XContentTypeOptions] = "nosniff";
        // Public catalog images are safe to cache; keys are stable references.
        Response.Headers[HeaderNames.CacheControl] = "public, max-age=3600";
        return File(file.Content, file.ContentType);
    }
}

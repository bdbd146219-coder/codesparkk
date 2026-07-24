using CodeSparkKids.Api.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.Common.Media;
using CodeSparkKids.Application.DTOs.Admin;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Media;

/// <summary>
/// Authenticated, staff-only catalog media upload (Admin/SuperAdmin via
/// <see cref="CoursePolicies.Manage"/>). Accepts one image over
/// multipart/form-data, validates it by sniffing magic bytes — never by trusting
/// the filename or declared type, so SVG/HTML/scripts and double-extension tricks
/// are rejected — stores it under a server-generated safe key, and returns that
/// key. The stored file is immediately servable by the public read endpoint
/// (<c>GET /api/v1/media/{key}</c>); this endpoint never echoes a disk path.
/// </summary>
[ApiController]
[Route("api/v1/admin/catalog/media")]
[Tags("Admin Catalog Media")]
[Produces("application/json")]
[Authorize(Policy = CoursePolicies.Manage)]
public sealed class AdminCatalogMediaController(
    ICatalogMediaWriteStore media,
    ICatalogMediaCleanupService cleanup) : ControllerBase
{
    // Hard transport cap, a little above the 5 MB policy limit to allow multipart
    // overhead. The policy returns a friendly 400 well before this 413 backstop.
    private const long RequestCap = CatalogMediaUpload.MaxSizeBytes + (512 * 1024);

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(RequestCap)]
    [RequestFormLimits(MultipartBodyLengthLimit = RequestCap)]
    [ProducesResponseType(typeof(CatalogMediaUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Upload(
        [FromForm] string? kind,
        [FromForm] string? slug,
        IFormFile? file,
        CancellationToken ct)
    {
        if (file is null || file.Length <= 0)
        {
            throw Invalid("Choose an image file to upload.");
        }

        // Fail fast before buffering — never read a grossly oversized body into
        // memory just to reject it.
        if (file.Length > CatalogMediaUpload.MaxSizeBytes)
        {
            throw Invalid("Image is too large. Maximum size is 5 MB.");
        }

        // Buffer once (bounded by the size check) so we can sniff the header and
        // then write the exact same bytes.
        byte[] bytes;
        await using (var upload = file.OpenReadStream())
        using (var buffer = new MemoryStream())
        {
            await upload.CopyToAsync(buffer, ct);
            bytes = buffer.ToArray();
        }

        // Sniff + validate in a synchronous helper: a ReadOnlySpan local cannot
        // live in this async method.
        var failure = ValidateBytes(kind, bytes, out var extension, out var contentType);
        if (failure != CatalogMediaUpload.Failure.None)
        {
            throw Invalid(MessageFor(failure));
        }

        var key = CatalogMediaUpload.BuildKey(kind!, slug, extension);

        using (var toStore = new MemoryStream(bytes, writable: false))
        {
            await media.SaveAsync(key, toStore, ct);
        }

        return Ok(new CatalogMediaUploadResponse(key, contentType, bytes.LongLength));
    }

    /// <summary>
    /// Scan the catalog media root for orphaned files and, only when the caller
    /// explicitly sends <c>"dryRun": false</c>, delete the eligible orphans
    /// (unreferenced by any course/learning path — soft-deleted included — and
    /// older than the grace period). Dry-run is the default and deletes nothing.
    /// The response carries safe relative storage keys and counts only — never a
    /// disk path. There is no automatic or scheduled cleanup; this endpoint is
    /// the only trigger (C4L).
    /// </summary>
    [HttpPost("cleanup")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(CatalogMediaCleanupResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Cleanup([FromBody] CatalogMediaCleanupRequest? request, CancellationToken ct)
    {
        var effective = request ?? new CatalogMediaCleanupRequest();

        if (effective.GracePeriodHours is { } grace &&
            !CatalogMediaCleanupPolicy.IsValidGracePeriod(grace))
        {
            throw new ValidationException([new ValidationFailure(
                "gracePeriodHours",
                $"gracePeriodHours must be between {CatalogMediaCleanupPolicy.MinGracePeriodHours} " +
                $"and {CatalogMediaCleanupPolicy.MaxGracePeriodHours}.")]);
        }

        return Ok(await cleanup.RunAsync(effective, ct));
    }

    private static CatalogMediaUpload.Failure ValidateBytes(
        string? kind, byte[] bytes, out string extension, out string contentType)
    {
        var header = bytes.Length >= CatalogMediaUpload.SniffLength
            ? bytes.AsSpan(0, CatalogMediaUpload.SniffLength)
            : bytes.AsSpan();
        return CatalogMediaUpload.Validate(kind, bytes.LongLength, header, out extension, out contentType);
    }

    private static ValidationException Invalid(string message) =>
        new([new ValidationFailure("file", message)]);

    private static string MessageFor(CatalogMediaUpload.Failure failure) => failure switch
    {
        CatalogMediaUpload.Failure.Empty => "Choose an image file to upload.",
        CatalogMediaUpload.Failure.TooLarge => "Image is too large. Maximum size is 5 MB.",
        CatalogMediaUpload.Failure.UnknownKind => "Unsupported media kind.",
        _ => "Unsupported image type. Use PNG, JPEG, WebP, or GIF.",
    };
}

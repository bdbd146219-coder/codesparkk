using CodeSparkKids.Infrastructure.FileStorage;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Api.Health;

/// <summary>
/// Readiness signal for the catalog media storage root (C4K). Verifies that the
/// configured LocalDisk root exists — creating it if absent, exactly as the write
/// path does — and is writable, using a tiny probe file that is removed
/// immediately.
///
/// It reports <see cref="HealthStatus.Degraded"/> — never
/// <see cref="HealthStatus.Unhealthy"/> — on any failure, so a media-storage
/// problem is surfaced to operators/monitoring (readiness reports "Degraded")
/// <em>without</em> taking the whole API instance out of rotation: public catalog
/// reads still work (falling back to the branded tile) and only admin uploads are
/// affected. The resolved disk path is logged for the operator and never returned
/// in the health response, so this adds no path-exposure surface.
/// </summary>
public sealed class CatalogMediaStorageHealthCheck(
    IOptions<LocalDiskFileStorageOptions> options,
    ILogger<CatalogMediaStorageHealthCheck> logger) : IHealthCheck
{
    // Resolve the root the same way the store does, so the check and the writes
    // agree on exactly one directory.
    private readonly string _root = Path.GetFullPath(options.Value.RootPath);

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            Directory.CreateDirectory(_root);

            // A `.tmp` probe with a leading-dot GUID name can never be served: the
            // public read endpoint's key allow-list rejects non-image extensions,
            // and the file is deleted immediately regardless.
            var probe = Path.Combine(_root, $".healthcheck-{Guid.NewGuid():N}.tmp");
            File.WriteAllBytes(probe, Array.Empty<byte>());
            File.Delete(probe);

            return Task.FromResult(HealthCheckResult.Healthy(
                "Catalog media storage root is present and writable."));
        }
        catch (Exception ex)
        {
            // Log the path for the operator; keep it out of the health response.
            logger.LogError(ex, "Catalog media storage root is not writable: {Root}", _root);
            return Task.FromResult(HealthCheckResult.Degraded(
                "Catalog media storage root is missing or not writable; admin uploads will fail until it is fixed."));
        }
    }
}

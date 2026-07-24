using System.Net;
using CodeSparkKids.Api.Health;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Infrastructure.FileStorage;
using FluentAssertions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Api.IntegrationTests.Health;

/// <summary>
/// C4K — the catalog media storage readiness probe. Healthy when the configured
/// root is present/creatable and writable; Degraded (never Unhealthy, so it never
/// drops the instance) when it is not, and the response never carries the path.
/// </summary>
public class CatalogMediaStorageHealthCheckTests
{
    private static CatalogMediaStorageHealthCheck Build(string rootPath) =>
        new(Options.Create(new LocalDiskFileStorageOptions { RootPath = rootPath }),
            NullLogger<CatalogMediaStorageHealthCheck>.Instance);

    private static readonly HealthCheckContext Context = new()
    {
        Registration = new HealthCheckRegistration("catalog_media_storage", _ => null!, HealthStatus.Degraded, tags: null),
    };

    [Fact]
    public async Task Healthy_when_root_is_writable_and_created_if_absent()
    {
        // A not-yet-existing subdir under the temp root — the check must create it.
        var root = Path.Combine(Path.GetTempPath(), "csk-c4k-health", Guid.NewGuid().ToString("N"), "media");
        try
        {
            var result = await Build(root).CheckHealthAsync(Context);

            result.Status.Should().Be(HealthStatus.Healthy);
            Directory.Exists(root).Should().BeTrue("the check creates the root like the write path does");
            // The probe file must be cleaned up (no leftover health artifacts served).
            Directory.GetFiles(root).Should().BeEmpty();
        }
        finally
        {
            try { Directory.Delete(Path.GetDirectoryName(root)!, recursive: true); } catch { /* best effort */ }
        }
    }

    [Fact]
    public async Task Degraded_and_no_path_leak_when_root_cannot_be_created()
    {
        // Point the root at a path *under an existing file*, so CreateDirectory fails.
        var file = Path.Combine(Path.GetTempPath(), $"csk-c4k-health-{Guid.NewGuid():N}.tmp");
        await File.WriteAllTextAsync(file, "x");
        var unwritableRoot = Path.Combine(file, "media"); // parent is a file → cannot create
        try
        {
            var result = await Build(unwritableRoot).CheckHealthAsync(Context);

            result.Status.Should().Be(HealthStatus.Degraded, "a media-root problem must never fail the whole instance");
            (result.Description ?? string.Empty).Should().NotContain(file, "the health response must not leak the disk path");
            (result.Description ?? string.Empty).Should().NotContainAny(":\\", ":/");
        }
        finally
        {
            try { File.Delete(file); } catch { /* best effort */ }
        }
    }
}

/// <summary>
/// C4K — the health endpoint wiring: readiness runs the media-storage check
/// (the test host's storage root is a writable temp dir, so it is Healthy) and
/// liveness stays dependency-free. Both return 200 and leak no path.
/// </summary>
public class HealthEndpointTests
{
    [Fact]
    public async Task Ready_and_live_endpoints_return_200_without_path_leakage()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var ready = await client.GetAsync("/health/ready");
        ready.StatusCode.Should().Be(HttpStatusCode.OK);
        var readyBody = await ready.Content.ReadAsStringAsync();
        readyBody.Should().Be("Healthy");
        readyBody.Should().NotContainAny(":\\", ":/", factory.MediaRoot);

        var live = await client.GetAsync("/health/live");
        live.StatusCode.Should().Be(HttpStatusCode.OK);
        (await live.Content.ReadAsStringAsync()).Should().Be("Healthy");
    }
}

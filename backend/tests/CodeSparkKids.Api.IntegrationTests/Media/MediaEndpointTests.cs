using System.Net;
using CodeSparkKids.Api.IntegrationTests.Support;

namespace CodeSparkKids.Api.IntegrationTests.Media;

public class MediaEndpointTests : IClassFixture<MediaTestFactory>
{
    // 8-byte PNG signature — enough for a non-empty, extension-typed response.
    private static readonly byte[] PngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private readonly MediaTestFactory _factory;

    public MediaEndpointTests(MediaTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Get_ExistingImage_Returns200WithImageTypeAndSecurityHeaders()
    {
        _factory.WriteFile("courses/python/thumb.png", PngBytes);
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/media/courses/python/thumb.png");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/png", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadAsByteArrayAsync();
        Assert.NotEmpty(body);

        Assert.True(response.Headers.TryGetValues("X-Content-Type-Options", out var nosniff));
        Assert.Contains("nosniff", nosniff!);
        Assert.NotNull(response.Headers.CacheControl);
        Assert.True(response.Headers.CacheControl!.Public);
    }

    [Fact]
    public async Task Get_ExistingJpeg_ReturnsJpegContentType()
    {
        _factory.WriteFile("banners/hero.jpg", PngBytes);
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/media/banners/hero.jpg");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Get_MissingFileWithSafeKey_Returns404WithoutLeakingPaths()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/media/courses/python/missing.png");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await AssertNoPathLeakage(response);
    }

    [Theory]
    [InlineData("notes.txt")] // unsupported extension, even though the file exists
    [InlineData("logo.svg")] // SVG is intentionally never served
    public async Task Get_UnsupportedType_Returns404EvenWhenFileExists(string key)
    {
        _factory.WriteFile(key, PngBytes);
        using var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/media/{key}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await AssertNoPathLeakage(response);
    }

    [Fact]
    public async Task Get_TraversalKey_DoesNotServeFilesOutsideRoot()
    {
        // Plant a secret next to (outside) the media root.
        var parent = Directory.GetParent(_factory.MediaRoot)!.FullName;
        var secretPath = Path.Combine(parent, $"outside-secret-{Guid.NewGuid():N}.png");
        await File.WriteAllTextAsync(secretPath, "TOP-SECRET");
        try
        {
            using var client = _factory.CreateClient();

            // Encoded "../" so HttpClient does not collapse it before sending.
            var response = await client.GetAsync(
                $"/api/v1/media/%2e%2e%2f{Path.GetFileName(secretPath)}");

            // Either the router or our validator rejects it — never a 200.
            Assert.True(
                response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest,
                $"expected 404/400, got {(int)response.StatusCode}");
            var body = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("TOP-SECRET", body);
            await AssertNoPathLeakage(response);
        }
        finally
        {
            File.Delete(secretPath);
        }
    }

    private async Task AssertNoPathLeakage(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(_factory.MediaRoot, body);
        Assert.DoesNotContain("storage", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(":\\", body); // no Windows drive path
    }
}

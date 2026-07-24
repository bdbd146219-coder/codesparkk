using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Domain.Auth;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Media;

/// <summary>
/// Integration coverage for the authenticated admin catalog-media upload
/// (<c>POST /api/v1/admin/catalog/media</c>): the security boundary (auth, role,
/// file-type sniffing, size), that an uploaded image becomes servable through the
/// public read endpoint, and that no disk path ever leaks.
/// </summary>
public class AdminCatalogMediaUploadTests
{
    private const string Url = "/api/v1/admin/catalog/media";

    // 8-byte PNG signature + a little padding — enough to sniff as image/png.
    private static readonly byte[] PngBytes =
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52];

    private static MultipartFormDataContent Multipart(
        byte[] fileBytes, string kind, string? slug, string fileName = "thumb.png", string contentType = "image/png")
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(fileBytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(file, "file", fileName);
        form.Add(new StringContent(kind), "kind");
        if (slug is not null) form.Add(new StringContent(slug), "slug");
        return form;
    }

    private static async Task<string> AdminTokenAsync(AuthTestFactory factory, HttpClient client) =>
        await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);

    [Fact]
    public async Task Admin_uploads_png_and_the_key_is_servable_publicly()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await AdminTokenAsync(factory, client);

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = Multipart(PngBytes, "course-thumbnail", "python-adventures"),
        }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var key = payload.GetProperty("key").GetString()!;
        key.Should().StartWith("catalog/courses/python-adventures/thumbnail/");
        key.Should().EndWith(".png");
        payload.GetProperty("contentType").GetString().Should().Be("image/png");
        payload.GetProperty("sizeBytes").GetInt64().Should().Be(PngBytes.Length);

        // The uploaded image is immediately servable by the public read endpoint.
        var read = await client.GetAsync($"/api/v1/media/{key}");
        read.StatusCode.Should().Be(HttpStatusCode.OK);
        read.Content.Headers.ContentType!.MediaType.Should().Be("image/png");
        (await read.Content.ReadAsByteArrayAsync()).Should().Equal(PngBytes);
    }

    [Fact]
    public async Task Response_never_contains_a_disk_path()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await AdminTokenAsync(factory, client);

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = Multipart(PngBytes, "course-thumbnail", "python-adventures"),
        }.WithBearer(token);
        var resp = await client.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();

        body.Should().NotContain(factory.MediaRoot);
        body.Should().NotContain(":\\"); // no Windows drive path
        body.Should().NotContain("storage");
    }

    [Fact]
    public async Task Anonymous_upload_is_401()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = Multipart(PngBytes, "course-thumbnail", "x"),
        };
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Parent_upload_is_403()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "parent@example.com");
        var (_, login) = await client.LoginAsync("parent@example.com");

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = Multipart(PngBytes, "course-thumbnail", "x"),
        }.WithBearer(login!.AccessToken);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Instructor_upload_is_403()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "instructor@example.com", AppRoles.Instructor);

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = Multipart(PngBytes, "course-thumbnail", "x"),
        }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Svg_is_rejected_400()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await AdminTokenAsync(factory, client);
        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script/></svg>");

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            // Even claiming a valid extension + type cannot smuggle SVG past the sniff.
            Content = Multipart(svg, "course-thumbnail", "x", "logo.svg", "image/svg+xml"),
        }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Text_disguised_as_png_is_rejected_400()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await AdminTokenAsync(factory, client);
        var text = Encoding.UTF8.GetBytes("this is not really an image at all");

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            // Lies about being a PNG; the magic-byte sniff is authoritative.
            Content = Multipart(text, "course-thumbnail", "x", "evil.png", "image/png"),
        }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Unknown_kind_is_rejected_400()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await AdminTokenAsync(factory, client);

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = Multipart(PngBytes, "course-banner", "x"),
        }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Missing_file_is_rejected_400()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await AdminTokenAsync(factory, client);
        var form = new MultipartFormDataContent { { new StringContent("course-thumbnail"), "kind" } };

        var req = new HttpRequestMessage(HttpMethod.Post, Url) { Content = form }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Oversize_image_is_rejected_400_without_leaking_paths()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await AdminTokenAsync(factory, client);

        // Just over the 5 MB policy cap but under the transport backstop, so the
        // action runs and returns a friendly 400 (not a raw 413).
        var big = new byte[(5 * 1024 * 1024) + 1024];
        PngBytes.CopyTo(big, 0);

        var req = new HttpRequestMessage(HttpMethod.Post, Url)
        {
            Content = Multipart(big, "course-thumbnail", "x"),
        }.WithBearer(token);
        var resp = await client.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        body.Should().NotContain(factory.MediaRoot);
        body.Should().NotContain(":\\");
    }
}

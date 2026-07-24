using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseLifecycleTests
{
    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        return (factory, client, token);
    }

    private static async Task<AdminCourseListItemDto> GetItemAsync(HttpClient client, string token, string slug)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/courses?pageSize=100").WithBearer(token);
        var resp = await client.SendAsync(req);
        var page = await resp.Content.ReadFromJsonAsync<PagedResult<AdminCourseListItemDto>>();
        return page!.Items.Single(c => c.Slug == slug);
    }

    private static Task<HttpResponseMessage> ActAsync(HttpClient client, string token, Guid id, string action, string rowVersion)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/admin/courses/{id}/{action}")
        {
            Content = JsonContent.Create(new LifecycleRequest(rowVersion)),
        }.WithBearer(token);
        return client.SendAsync(req);
    }

    private static async Task<bool> PublicListContainsAsync(HttpClient client, string slug)
    {
        var page = await client.GetFromJsonAsync<PagedResult<CourseCardDto>>("/api/v1/catalog/courses?pageSize=100");
        return page!.Items.Any(c => c.Slug == slug);
    }

    // --- Publish -----------------------------------------------------------

    [Fact]
    public async Task Publish_ready_draft_succeeds_and_appears_in_public_catalog()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var id = await CatalogTestData.AddReadyDraftAsync(factory, "ready-draft");
        var item = await GetItemAsync(client, token, "ready-draft");

        var resp = await ActAsync(client, token, id, "publish", item.RowVersion);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<LifecycleResponseDto>();
        body!.PublishState.Should().Be("Published");
        body.IsListed.Should().BeTrue();
        body.PublishedAt.Should().NotBeNull();

        (await PublicListContainsAsync(client, "ready-draft")).Should().BeTrue();
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CoursePublished)).Should().Be(1);
    }

    [Fact]
    public async Task Publish_incomplete_draft_returns_422_with_readiness_checklist()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course"); // intentionally incomplete

        var resp = await ActAsync(client, token, item.Id, "publish", item.RowVersion);

        resp.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var raw = await resp.Content.ReadAsStringAsync();
        raw.Should().Contain("catalog/course-publish-checklist-failed");
        raw.Should().Contain("readiness");
        raw.Should().Contain("thumbnail-missing");
        raw.Should().Contain("courses.readiness.thumbnailMissing");
    }

    [Fact]
    public async Task Publish_missing_rowVersion_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var id = await CatalogTestData.AddReadyDraftAsync(factory, "ready-draft");

        var resp = await ActAsync(client, token, id, "publish", null!);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Publish_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var id = await CatalogTestData.AddReadyDraftAsync(factory, "ready-draft");

        var stale = Convert.ToBase64String(new byte[] { 9, 9, 9, 9 });
        var resp = await ActAsync(client, token, id, "publish", stale);

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/course-concurrency-conflict");
    }

    // --- Unpublish ---------------------------------------------------------

    [Fact]
    public async Task Unpublish_returns_course_to_draft_and_hides_from_public()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python-first-steps"); // published+listed

        (await PublicListContainsAsync(client, "python-first-steps")).Should().BeTrue();

        var resp = await ActAsync(client, token, item.Id, "unpublish", item.RowVersion);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<LifecycleResponseDto>();
        body!.PublishState.Should().Be("Draft");
        body.IsListed.Should().BeFalse();

        (await PublicListContainsAsync(client, "python-first-steps")).Should().BeFalse();
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseUnpublished)).Should().Be(1);
    }

    [Fact]
    public async Task Unpublish_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python-first-steps");

        var resp = await ActAsync(client, token, item.Id, "unpublish", Convert.ToBase64String(new byte[] { 1, 2 }));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // --- Archive -----------------------------------------------------------

    [Fact]
    public async Task Archive_hides_from_public_list_and_detail()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python-first-steps");

        var resp = await ActAsync(client, token, item.Id, "archive", item.RowVersion);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<LifecycleResponseDto>())!.PublishState.Should().Be("Archived");

        (await PublicListContainsAsync(client, "python-first-steps")).Should().BeFalse();
        var publicDetail = await client.GetAsync("/api/v1/catalog/courses/python-first-steps");
        publicDetail.StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseArchived)).Should().Be(1);
    }

    [Fact]
    public async Task Archive_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python-first-steps");

        var resp = await ActAsync(client, token, item.Id, "archive", Convert.ToBase64String(new byte[] { 7 }));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // --- Restore -----------------------------------------------------------

    [Fact]
    public async Task Restore_returns_archived_course_to_draft_still_hidden()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var archived = await GetItemAsync(client, token, "archived-course");

        var resp = await ActAsync(client, token, archived.Id, "restore", archived.RowVersion);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<LifecycleResponseDto>())!.PublishState.Should().Be("Draft");

        (await PublicListContainsAsync(client, "archived-course")).Should().BeFalse();
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseRestored)).Should().Be(1);
    }

    [Fact]
    public async Task Restore_non_archived_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python-first-steps"); // published, not archived

        var resp = await ActAsync(client, token, item.Id, "restore", item.RowVersion);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/course-invalid-state");
    }

    [Fact]
    public async Task Unknown_course_returns_404()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var resp = await ActAsync(client, token, Guid.NewGuid(), "publish", "");

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // --- Authorization -----------------------------------------------------

    [Theory]
    [InlineData("publish")]
    [InlineData("unpublish")]
    [InlineData("archive")]
    [InlineData("restore")]
    public async Task Anonymous_gets_401_for_every_lifecycle_endpoint(string action)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync($"/api/v1/admin/courses/{Guid.NewGuid()}/{action}", new LifecycleRequest(""));

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("publish", AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData("publish", AppRoles.Instructor, HttpStatusCode.Forbidden)]
    [InlineData("archive", AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData("archive", AppRoles.Instructor, HttpStatusCode.Forbidden)]
    [InlineData("unpublish", AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData("restore", AppRoles.Instructor, HttpStatusCode.Forbidden)]
    public async Task Non_staff_roles_are_forbidden(string action, string role, HttpStatusCode expected)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        string token;
        if (role == AppRoles.Parent)
        {
            await factory.RegisterAndVerifyAsync(client, "parent@example.com");
            var (_, login) = await client.LoginAsync("parent@example.com");
            token = login!.AccessToken;
        }
        else
        {
            token = await factory.CreateRoleUserAndLoginAsync(client, $"{role}@example.com", role);
        }

        var resp = await ActAsync(client, token, Guid.NewGuid(), action, "");

        resp.StatusCode.Should().Be(expected);
    }

    [Theory]
    [InlineData(AppRoles.Admin)]
    [InlineData(AppRoles.SuperAdmin)]
    public async Task Staff_roles_can_publish(string role)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, $"{role}@example.com", role);
        var id = await CatalogTestData.AddReadyDraftAsync(factory, "ready-draft");
        var item = await GetItemAsync(client, token, "ready-draft");

        var resp = await ActAsync(client, token, id, "publish", item.RowVersion);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseUpdateTests
{
    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token, Guid CategoryId)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var categoryId = await factory.GetCategoryIdAsync("python");
        return (factory, client, token, categoryId);
    }

    private static async Task<AdminCourseListItemDto> GetItemAsync(HttpClient client, string token, string slug)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/courses?pageSize=100").WithBearer(token);
        var resp = await client.SendAsync(req);
        var page = await resp.Content.ReadFromJsonAsync<PagedResult<AdminCourseListItemDto>>();
        return page!.Items.Single(c => c.Slug == slug);
    }

    private static UpdateCourseRequest BuildUpdate(
        string rowVersion, Guid categoryId, string? slug = null, string titleEn = "Updated Title") => new(
        RowVersion: rowVersion,
        Slug: slug,
        TitleEn: titleEn,
        TitleAr: "عنوان محدّث",
        SubtitleEn: "Sub EN", SubtitleAr: "فرعي",
        SummaryEn: "Summary EN", SummaryAr: "ملخص",
        DescriptionEn: "Description EN", DescriptionAr: "وصف",
        DeliveryType: nameof(CourseDeliveryType.Recorded),
        Difficulty: nameof(CourseDifficulty.Beginner),
        AgeBand: nameof(AgeBand.Junior),
        MinAge: 6, MaxAge: 9,
        PrimaryCategoryId: categoryId,
        IsListed: false,
        Pricing: null, Media: null, Outcomes: null);

    private static Task<HttpResponseMessage> PutAsync(HttpClient client, string token, Guid id, UpdateCourseRequest body)
    {
        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/courses/{id}") { Content = JsonContent.Create(body) }.WithBearer(token);
        return client.SendAsync(req);
    }

    [Fact]
    public async Task Admin_updates_draft_fields()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var draft = await GetItemAsync(client, token, "draft-course");

        var resp = await PutAsync(client, token, draft.Id, BuildUpdate(draft.RowVersion, categoryId, titleEn: "Renamed Draft"));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>();
        detail!.TitleEn.Should().Be("Renamed Draft");
        detail.SummaryEn.Should().Be("Summary EN");
        detail.RowVersion.Should().NotBeNull();

        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseUpdated)).Should().Be(1);
    }

    [Fact]
    public async Task Admin_can_change_slug_and_category()
    {
        var (factory, client, token, _) = await SetupAsync();
        await using var _f = factory;
        var draft = await GetItemAsync(client, token, "draft-course");
        var roboticsId = await factory.GetCategoryIdAsync("robotics");

        var resp = await PutAsync(client, token, draft.Id,
            BuildUpdate(draft.RowVersion, roboticsId, slug: "draft-course-renamed"));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>();
        detail!.Slug.Should().Be("draft-course-renamed");
        detail.Category!.Slug.Should().Be("robotics");
    }

    [Fact]
    public async Task Missing_rowVersion_returns_400()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var draft = await GetItemAsync(client, token, "draft-course");

        var resp = await PutAsync(client, token, draft.Id, BuildUpdate(null!, categoryId));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Garbled_rowVersion_returns_400()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var draft = await GetItemAsync(client, token, "draft-course");

        var resp = await PutAsync(client, token, draft.Id, BuildUpdate("not-base64!!!", categoryId));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Stale_rowVersion_returns_409_with_current_token()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var draft = await GetItemAsync(client, token, "draft-course");

        var stale = Convert.ToBase64String(new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 });
        var resp = await PutAsync(client, token, draft.Id, BuildUpdate(stale, categoryId));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await resp.Content.ReadAsStringAsync();
        body.Should().Contain("catalog/course-concurrency-conflict");
        body.Should().Contain("currentRowVersion");
    }

    [Fact]
    public async Task Rename_to_existing_slug_returns_409()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var draft = await GetItemAsync(client, token, "draft-course");

        var resp = await PutAsync(client, token, draft.Id, BuildUpdate(draft.RowVersion, categoryId, slug: "python-first-steps"));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/course-slug-already-exists");
    }

    [Fact]
    public async Task Unknown_category_returns_404()
    {
        var (factory, client, token, _) = await SetupAsync();
        await using var _f = factory;
        var draft = await GetItemAsync(client, token, "draft-course");

        var resp = await PutAsync(client, token, draft.Id, BuildUpdate(draft.RowVersion, Guid.NewGuid()));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/category-not-found");
    }

    [Fact]
    public async Task Archived_course_update_returns_400()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var archived = await GetItemAsync(client, token, "archived-course");

        var resp = await PutAsync(client, token, archived.Id, BuildUpdate(archived.RowVersion, categoryId));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/course-invalid-state");
    }

    [Fact]
    public async Task Unknown_course_returns_404()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;

        var resp = await PutAsync(client, token, Guid.NewGuid(), BuildUpdate("", categoryId));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Anonymous_gets_401_and_parent_gets_403()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var id = Guid.NewGuid(); // authorization runs before the handler

        var anon = await client.PutAsJsonAsync($"/api/v1/admin/courses/{id}", BuildUpdate("", categoryId));
        anon.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        await factory.RegisterAndVerifyAsync(client, "parent@example.com");
        var (_, login) = await client.LoginAsync("parent@example.com");
        var parentResp = await PutAsync(client, login!.AccessToken, id, BuildUpdate("", categoryId));
        parentResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

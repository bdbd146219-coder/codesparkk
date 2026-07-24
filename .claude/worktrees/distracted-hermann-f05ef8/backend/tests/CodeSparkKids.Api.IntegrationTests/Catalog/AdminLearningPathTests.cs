using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminLearningPathTests
{
    private const string Url = "/api/v1/admin/learning-paths";

    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory); // junior-journey (Published), draft-path (Draft)
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        return (factory, client, token);
    }

    private static CreateLearningPathRequest ValidCreate(string titleEn = "New Path", string? slug = "new-path") =>
        new(titleEn, "مسار جديد", "Summary EN", "ملخص", nameof(AgeBand.Junior), slug, null);

    private static async Task<PagedResult<AdminLearningPathListItemDto>> ListAsync(HttpClient client, string token, string qs)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{Url}{qs}").WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<PagedResult<AdminLearningPathListItemDto>>())!;
    }

    private static async Task<AdminLearningPathListItemDto> GetItemAsync(HttpClient client, string token, string slug)
    {
        var page = await ListAsync(client, token, "?pageSize=100");
        return page.Items.Single(c => c.Slug == slug);
    }

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, string token, string url, object body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) }.WithBearer(token);
        return client.SendAsync(req);
    }

    private static async Task<bool> PublicListContainsAsync(HttpClient client, string slug)
    {
        var page = await client.GetFromJsonAsync<PagedResult<LearningPathCardDto>>("/api/v1/catalog/learning-paths?pageSize=100");
        return page!.Items.Any(p => p.Slug == slug);
    }

    // --- Authorization -----------------------------------------------------

    [Fact]
    public async Task Anonymous_gets_401()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        (await client.GetAsync(Url)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData(AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Instructor, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Admin, HttpStatusCode.OK)]
    [InlineData(AppRoles.SuperAdmin, HttpStatusCode.OK)]
    public async Task Authorization_matrix(string role, HttpStatusCode expected)
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

        var req = new HttpRequestMessage(HttpMethod.Get, Url).WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(expected);
    }

    [Fact]
    public async Task Publish_and_archive_reject_anonymous()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var id = Guid.NewGuid();

        (await client.PostAsJsonAsync($"{Url}/{id}/publish", new LearningPathLifecycleRequest(""))).StatusCode
            .Should().Be(HttpStatusCode.Unauthorized);
        (await client.PostAsJsonAsync($"{Url}/{id}/archive", new LearningPathLifecycleRequest(""))).StatusCode
            .Should().Be(HttpStatusCode.Unauthorized);
    }

    // --- List --------------------------------------------------------------

    [Fact]
    public async Task List_includes_draft_and_published()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var page = await ListAsync(client, token, "?pageSize=100");
        page.Items.Select(p => p.Slug).Should().Contain(new[] { "junior-journey", "draft-path" });
        page.Items.Single(p => p.Slug == "junior-journey").PublishState.Should().Be("Published");
        page.Items.Single(p => p.Slug == "draft-path").PublishState.Should().Be("Draft");
    }

    [Theory]
    [InlineData("?status=Published", "junior-journey")]
    [InlineData("?status=Draft", "draft-path")]
    [InlineData("?ageBand=Junior", "junior-journey")]
    [InlineData("?ageBand=Explorer", "draft-path")]
    [InlineData("?isListed=true", "junior-journey")]
    [InlineData("?q=junior", "junior-journey")]
    public async Task Supports_filters(string qs, string expectedSlug)
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var page = await ListAsync(client, token, qs + "&pageSize=100");
        page.Items.Should().ContainSingle();
        page.Items[0].Slug.Should().Be(expectedSlug);
    }

    [Fact]
    public async Task Invalid_pagination_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var req = new HttpRequestMessage(HttpMethod.Get, $"{Url}?page=0").WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // --- Create ------------------------------------------------------------

    [Fact]
    public async Task Admin_creates_draft_not_public()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostAsync(client, token, Url, ValidCreate());
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        resp.Headers.Location.Should().NotBeNull();
        var created = await resp.Content.ReadFromJsonAsync<CreateLearningPathResponse>();
        created!.Slug.Should().Be("new-path");
        created.PublishState.Should().Be("Draft");
        created.RowVersion.Should().NotBeNull();

        (await PublicListContainsAsync(client, "new-path")).Should().BeFalse();
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathCreated)).Should().Be(1);
    }

    [Fact]
    public async Task Slug_derived_from_title_when_omitted()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var resp = await PostAsync(client, token, Url, ValidCreate("Explorer Track Two", slug: null));
        (await resp.Content.ReadFromJsonAsync<CreateLearningPathResponse>())!.Slug.Should().Be("explorer-track-two");
    }

    [Fact]
    public async Task Duplicate_slug_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var resp = await PostAsync(client, token, Url, ValidCreate(slug: "junior-journey"));
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/learning-path-slug-already-exists");
    }

    [Fact]
    public async Task Invalid_payload_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        (await PostAsync(client, token, Url, ValidCreate(titleEn: ""))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await PostAsync(client, token, Url, ValidCreate(slug: "Bad Slug!"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // --- Update ------------------------------------------------------------

    private static UpdateLearningPathRequest Update(string rowVersion, string? slug = null, string titleEn = "Updated", bool isListed = false) =>
        new(rowVersion, slug, titleEn, "محدث", "Sum", "ملخص", nameof(AgeBand.Junior), isListed, null);

    [Fact]
    public async Task Admin_updates_draft_path()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-path");

        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}")
        { Content = JsonContent.Create(Update(item.RowVersion, titleEn: "Renamed Draft Path")) }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<AdminLearningPathDetailDto>())!.TitleEn.Should().Be("Renamed Draft Path");
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathUpdated)).Should().Be(1);
    }

    [Fact]
    public async Task Update_missing_rowVersion_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-path");
        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}")
        { Content = JsonContent.Create(Update(null!)) }.WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-path");
        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}")
        { Content = JsonContent.Create(Update(Convert.ToBase64String(new byte[] { 1, 2, 3 }))) }.WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/learning-path-concurrency-conflict");
    }

    [Fact]
    public async Task Update_rename_to_existing_slug_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-path");
        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}")
        { Content = JsonContent.Create(Update(item.RowVersion, slug: "junior-journey")) }.WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Update_archived_path_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "junior-journey");
        await PostAsync(client, token, $"{Url}/{item.Id}/archive", new LearningPathLifecycleRequest(item.RowVersion));
        var archived = await GetItemAsync(client, token, "junior-journey");

        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{archived.Id}")
        { Content = JsonContent.Create(Update(archived.RowVersion)) }.WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/learning-path-invalid-state");
    }

    // --- Publish / readiness -----------------------------------------------

    [Fact]
    public async Task Publish_empty_draft_returns_422_no_items()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-path"); // no items

        var resp = await PostAsync(client, token, $"{Url}/{item.Id}/publish", new LearningPathLifecycleRequest(item.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var raw = await resp.Content.ReadAsStringAsync();
        raw.Should().Contain("catalog/learning-path-publish-checklist-failed");
        raw.Should().Contain("no-items");
    }

    [Fact]
    public async Task Publish_path_with_only_unpublished_courses_returns_422()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var id = await CatalogTestData.AddDraftPathWithUnpublishedItemAsync(factory, "unready-path");
        var item = await GetItemAsync(client, token, "unready-path");

        var resp = await PostAsync(client, token, $"{Url}/{item.Id}/publish", new LearningPathLifecycleRequest(item.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("no-published-course");
    }

    [Fact]
    public async Task Publish_ready_path_succeeds_and_is_public()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        // junior-journey is published with published-course items; unpublish then re-publish.
        var item = await GetItemAsync(client, token, "junior-journey");
        await PostAsync(client, token, $"{Url}/{item.Id}/unpublish", new LearningPathLifecycleRequest(item.RowVersion));
        var draft = await GetItemAsync(client, token, "junior-journey");

        var resp = await PostAsync(client, token, $"{Url}/{draft.Id}/publish", new LearningPathLifecycleRequest(draft.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<LearningPathLifecycleResponseDto>())!.PublishState.Should().Be("Published");

        (await PublicListContainsAsync(client, "junior-journey")).Should().BeTrue();
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathPublished)).Should().Be(1);
    }

    [Fact]
    public async Task Unpublish_returns_to_draft_and_hides_from_public()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "junior-journey");
        (await PublicListContainsAsync(client, "junior-journey")).Should().BeTrue();

        var resp = await PostAsync(client, token, $"{Url}/{item.Id}/unpublish", new LearningPathLifecycleRequest(item.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<LearningPathLifecycleResponseDto>())!.PublishState.Should().Be("Draft");

        (await PublicListContainsAsync(client, "junior-journey")).Should().BeFalse();
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathUnpublished)).Should().Be(1);
    }

    // --- Archive / Restore -------------------------------------------------

    [Fact]
    public async Task Archive_hides_from_public_list_and_detail()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "junior-journey");

        var resp = await PostAsync(client, token, $"{Url}/{item.Id}/archive", new LearningPathLifecycleRequest(item.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<LearningPathLifecycleResponseDto>())!.PublishState.Should().Be("Archived");

        (await PublicListContainsAsync(client, "junior-journey")).Should().BeFalse();
        (await client.GetAsync("/api/v1/catalog/learning-paths/junior-journey")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathArchived)).Should().Be(1);
    }

    [Fact]
    public async Task Restore_returns_to_draft_still_hidden()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "junior-journey");
        await PostAsync(client, token, $"{Url}/{item.Id}/archive", new LearningPathLifecycleRequest(item.RowVersion));
        var archived = await GetItemAsync(client, token, "junior-journey");

        var resp = await PostAsync(client, token, $"{Url}/{archived.Id}/restore", new LearningPathLifecycleRequest(archived.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<LearningPathLifecycleResponseDto>())!.PublishState.Should().Be("Draft");

        (await PublicListContainsAsync(client, "junior-journey")).Should().BeFalse();
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathRestored)).Should().Be(1);
    }

    [Fact]
    public async Task Restore_non_archived_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "junior-journey"); // published, not archived

        var resp = await PostAsync(client, token, $"{Url}/{item.Id}/restore", new LearningPathLifecycleRequest(item.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Unknown_id_returns_404()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var req = new HttpRequestMessage(HttpMethod.Get, $"{Url}/{Guid.NewGuid()}").WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Detail_shows_items_with_course_refs_and_readiness()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "junior-journey");

        var req = new HttpRequestMessage(HttpMethod.Get, $"{Url}/{item.Id}").WithBearer(token);
        var detail = await (await client.SendAsync(req)).Content.ReadFromJsonAsync<AdminLearningPathDetailDto>();

        detail!.Items.Should().NotBeEmpty();
        detail.Items.Should().OnlyContain(i => i.CourseSlug != null);
        detail.Readiness.IsReady.Should().BeTrue();
    }
}

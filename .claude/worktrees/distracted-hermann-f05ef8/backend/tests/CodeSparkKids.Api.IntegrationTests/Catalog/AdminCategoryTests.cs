using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCategoryTests
{
    private const string Url = "/api/v1/admin/categories";

    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory); // python, robotics (active), legacy (inactive)
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        return (factory, client, token);
    }

    private static CreateCategoryRequest ValidCreate(string nameEn = "New Category", string? slug = "new-category") =>
        new(nameEn, "تصنيف جديد", "Desc EN", "وصف", "icon", 7, slug);

    private static async Task<PagedResult<AdminCategoryListItemDto>> ListAsync(HttpClient client, string token, string qs)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{Url}{qs}").WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<PagedResult<AdminCategoryListItemDto>>())!;
    }

    private static async Task<AdminCategoryListItemDto> GetItemAsync(HttpClient client, string token, string slug)
    {
        var page = await ListAsync(client, token, "?pageSize=100");
        return page.Items.Single(c => c.Slug == slug);
    }

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, string token, string url, object body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) }.WithBearer(token);
        return client.SendAsync(req);
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

    // --- List --------------------------------------------------------------

    [Fact]
    public async Task List_includes_active_and_inactive()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var page = await ListAsync(client, token, "?pageSize=100");

        page.Items.Select(c => c.Slug).Should().Contain(new[] { "python", "robotics", "legacy" });
        page.Items.Should().Contain(c => c.Slug == "legacy" && !c.IsActive);
    }

    [Theory]
    [InlineData("?isActive=true", "legacy", false)]   // legacy excluded
    [InlineData("?isActive=false", "legacy", true)]   // only legacy
    public async Task Supports_isActive_filter(string qs, string slug, bool present)
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var page = await ListAsync(client, token, qs + "&pageSize=100");
        page.Items.Any(c => c.Slug == slug).Should().Be(present);
    }

    [Fact]
    public async Task Supports_q_filter_and_pagination()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        (await ListAsync(client, token, "?q=python")).Items.Should().ContainSingle(c => c.Slug == "python");

        var paged = await ListAsync(client, token, "?page=1&pageSize=1");
        paged.PageSize.Should().Be(1);
        paged.Items.Should().HaveCount(1);
        paged.TotalItems.Should().Be(3);
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
    public async Task Admin_creates_category_active_and_public()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostAsync(client, token, Url, ValidCreate());

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        resp.Headers.Location.Should().NotBeNull();
        var created = await resp.Content.ReadFromJsonAsync<CreateCategoryResponse>();
        created!.Slug.Should().Be("new-category");
        created.IsActive.Should().BeTrue();
        created.RowVersion.Should().NotBeNull();

        // Active category shows in the public categories endpoint.
        var publicCats = await client.GetFromJsonAsync<List<CategoryDto>>("/api/v1/catalog/categories");
        publicCats!.Should().Contain(c => c.Slug == "new-category");

        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CategoryCreated)).Should().Be(1);
    }

    [Fact]
    public async Task Slug_is_derived_from_name_when_omitted()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostAsync(client, token, Url, ValidCreate("Game Design", slug: null));
        var created = await resp.Content.ReadFromJsonAsync<CreateCategoryResponse>();

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        created!.Slug.Should().Be("game-design");
    }

    [Fact]
    public async Task Duplicate_slug_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var resp = await PostAsync(client, token, Url, ValidCreate(slug: "python"));
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/category-slug-already-exists");
    }

    [Fact]
    public async Task Invalid_slug_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        (await PostAsync(client, token, Url, ValidCreate(slug: "Bad Slug!"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Missing_name_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        (await PostAsync(client, token, Url, ValidCreate(nameEn: ""))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // --- Update ------------------------------------------------------------

    [Fact]
    public async Task Admin_updates_category()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python");

        var update = new UpdateCategoryRequest(item.RowVersion, "python-renamed", "Python Pro", "بايثون", "D", "و", "py", 9);
        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}") { Content = JsonContent.Create(update) }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<AdminCategoryDetailDto>();
        detail!.NameEn.Should().Be("Python Pro");
        detail.Slug.Should().Be("python-renamed");
        detail.Order.Should().Be(9);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CategoryUpdated)).Should().Be(1);
    }

    [Fact]
    public async Task Update_missing_rowVersion_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python");
        var update = new UpdateCategoryRequest(null!, null, "X", null, null, null, null, 1);
        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}") { Content = JsonContent.Create(update) }.WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python");
        var stale = Convert.ToBase64String(new byte[] { 1, 2, 3, 4 });
        var update = new UpdateCategoryRequest(stale, null, "X", null, null, null, null, 1);
        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}") { Content = JsonContent.Create(update) }.WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/category-concurrency-conflict");
    }

    [Fact]
    public async Task Update_rename_to_existing_slug_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python");
        var update = new UpdateCategoryRequest(item.RowVersion, "robotics", "X", null, null, null, null, 1);
        var req = new HttpRequestMessage(HttpMethod.Put, $"{Url}/{item.Id}") { Content = JsonContent.Create(update) }.WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Unknown_id_returns_404()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var req = new HttpRequestMessage(HttpMethod.Get, $"{Url}/{Guid.NewGuid()}").WithBearer(token);
        (await client.SendAsync(req)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // --- Activate / Deactivate ---------------------------------------------

    [Fact]
    public async Task Deactivate_hides_from_public_but_stays_in_admin_list()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python");

        var resp = await PostAsync(client, token, $"{Url}/{item.Id}/deactivate", new CategoryLifecycleRequest(item.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<AdminCategoryDetailDto>())!.IsActive.Should().BeFalse();

        var publicCats = await client.GetFromJsonAsync<List<CategoryDto>>("/api/v1/catalog/categories");
        publicCats!.Should().NotContain(c => c.Slug == "python");

        var adminList = await ListAsync(client, token, "?pageSize=100");
        adminList.Items.Should().Contain(c => c.Slug == "python" && !c.IsActive);

        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CategoryDeactivated)).Should().Be(1);
    }

    [Fact]
    public async Task Reactivate_restores_public_visibility()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var legacy = await GetItemAsync(client, token, "legacy"); // seeded inactive

        var resp = await PostAsync(client, token, $"{Url}/{legacy.Id}/activate", new CategoryLifecycleRequest(legacy.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<AdminCategoryDetailDto>())!.IsActive.Should().BeTrue();

        var publicCats = await client.GetFromJsonAsync<List<CategoryDto>>("/api/v1/catalog/categories");
        publicCats!.Should().Contain(c => c.Slug == "legacy");

        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CategoryActivated)).Should().Be(1);
    }

    [Fact]
    public async Task Deactivate_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "python");
        var resp = await PostAsync(client, token, $"{Url}/{item.Id}/deactivate",
            new CategoryLifecycleRequest(Convert.ToBase64String(new byte[] { 9, 9 })));
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Mutation_endpoints_reject_anonymous_and_parent()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var id = Guid.NewGuid();

        var anon = await client.PostAsJsonAsync($"{Url}/{id}/deactivate", new CategoryLifecycleRequest(""));
        anon.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        await factory.RegisterAndVerifyAsync(client, "parent@example.com");
        var (_, login) = await client.LoginAsync("parent@example.com");
        var parent = await PostAsync(client, login!.AccessToken, $"{Url}/{id}/deactivate", new CategoryLifecycleRequest(""));
        parent.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

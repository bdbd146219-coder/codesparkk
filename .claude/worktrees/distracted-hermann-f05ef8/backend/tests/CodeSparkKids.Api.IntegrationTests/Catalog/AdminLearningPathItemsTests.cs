using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminLearningPathItemsTests
{
    private const string Url = "/api/v1/admin/learning-paths";

    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory); // junior-journey (Published), draft-path (Draft, no items)
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        return (factory, client, token);
    }

    private static async Task<AdminLearningPathListItemDto> GetItemAsync(HttpClient client, string token, string slug)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{Url}?pageSize=100").WithBearer(token);
        var page = await (await client.SendAsync(req)).Content.ReadFromJsonAsync<PagedResult<AdminLearningPathListItemDto>>();
        return page!.Items.Single(p => p.Slug == slug);
    }

    private static async Task<(HttpResponseMessage Resp, AdminLearningPathDetailDto? Detail)> PostAsync(
        HttpClient client, string token, string url, object body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) }.WithBearer(token);
        var resp = await client.SendAsync(req);
        var detail = resp.IsSuccessStatusCode ? await resp.Content.ReadFromJsonAsync<AdminLearningPathDetailDto>() : null;
        return (resp, detail);
    }

    // --- Add ---------------------------------------------------------------

    [Fact]
    public async Task Admin_can_add_published_and_unpublished_course_items()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var published = await factory.GetCourseIdAsync("python-first-steps");
        var draftCourse = await factory.GetCourseIdAsync("draft-course");

        var (r1, d1) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, published, "first"));
        r1.StatusCode.Should().Be(HttpStatusCode.OK);
        d1!.Items.Should().ContainSingle(i => i.CourseId == published);
        d1.Items.Single().Order.Should().Be(0);

        // Adding a draft/unpublished course is allowed (planning).
        var (r2, d2) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(d1.RowVersion, draftCourse, null));
        r2.StatusCode.Should().Be(HttpStatusCode.OK);
        d2!.Items.Should().HaveCount(2);
        d2.Items.Select(i => i.Order).Should().Equal(0, 1);

        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathItemAdded)).Should().Be(2);
    }

    [Fact]
    public async Task Add_unknown_course_returns_404()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");

        var (resp, _) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, Guid.NewGuid(), null));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/course-not-found");
    }

    [Fact]
    public async Task Add_duplicate_course_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var course = await factory.GetCourseIdAsync("python-first-steps");

        var (_, d1) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, course, null));
        var (resp, _) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(d1!.RowVersion, course, null));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/learning-path-item-duplicate");
    }

    [Fact]
    public async Task Add_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var course = await factory.GetCourseIdAsync("python-first-steps");

        var (resp, _) = await PostAsync(client, token, $"{Url}/{path.Id}/items",
            new AddLearningPathItemRequest(Convert.ToBase64String(new byte[] { 1, 2 }), course, null));
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Add_missing_rowVersion_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var course = await factory.GetCourseIdAsync("python-first-steps");

        var (resp, _) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(null!, course, null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Add_item_to_archived_path_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var jj = await GetItemAsync(client, token, "junior-journey");
        await PostAsync(client, token, $"{Url}/{jj.Id}/archive", new LearningPathLifecycleRequest(jj.RowVersion));
        var archived = await GetItemAsync(client, token, "junior-journey");
        var course = await factory.GetCourseIdAsync("hidden-unlisted");

        var (resp, _) = await PostAsync(client, token, $"{Url}/{archived.Id}/items", new AddLearningPathItemRequest(archived.RowVersion, course, null));
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/learning-path-invalid-state");
    }

    // --- Remove ------------------------------------------------------------

    [Fact]
    public async Task Admin_can_remove_item_and_order_is_resequenced()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var c1 = await factory.GetCourseIdAsync("python-first-steps");
        var c2 = await factory.GetCourseIdAsync("robotics-live");
        var (_, d1) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, c1, null));
        var (_, d2) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(d1!.RowVersion, c2, null));
        var firstItemId = d2!.Items.OrderBy(i => i.Order).First().Id;

        var (resp, detail) = await PostAsync(client, token, $"{Url}/{path.Id}/items/{firstItemId}/remove", new LearningPathLifecycleRequest(d2.RowVersion));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        detail!.Items.Should().ContainSingle(i => i.CourseId == c2);
        detail.Items.Single().Order.Should().Be(0);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathItemRemoved)).Should().Be(1);
    }

    [Fact]
    public async Task Remove_unknown_item_returns_404()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");

        var (resp, _) = await PostAsync(client, token, $"{Url}/{path.Id}/items/{Guid.NewGuid()}/remove", new LearningPathLifecycleRequest(path.RowVersion));
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/learning-path-item-not-found");
    }

    // --- Reorder -----------------------------------------------------------

    [Fact]
    public async Task Admin_can_reorder_items()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var c1 = await factory.GetCourseIdAsync("python-first-steps");
        var c2 = await factory.GetCourseIdAsync("robotics-live");
        var c3 = await factory.GetCourseIdAsync("hidden-unlisted");
        var (_, d1) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, c1, null));
        var (_, d2) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(d1!.RowVersion, c2, null));
        var (_, d3) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(d2!.RowVersion, c3, null));
        var ids = d3!.Items.OrderBy(i => i.Order).Select(i => i.Id).ToList();
        var reversed = ids.AsEnumerable().Reverse().ToList();

        var (resp, detail) = await PostAsync(client, token, $"{Url}/{path.Id}/items/reorder", new ReorderLearningPathItemsRequest(d3.RowVersion, reversed));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        detail!.Items.OrderBy(i => i.Order).Select(i => i.Id).Should().Equal(reversed);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.LearningPathItemReordered)).Should().Be(1);
    }

    [Fact]
    public async Task Reorder_with_wrong_set_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var c1 = await factory.GetCourseIdAsync("python-first-steps");
        var c2 = await factory.GetCourseIdAsync("robotics-live");
        var (_, d1) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, c1, null));
        var (_, d2) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(d1!.RowVersion, c2, null));
        var ids = d2!.Items.Select(i => i.Id).ToList();
        var reorderUrl = $"{Url}/{path.Id}/items/reorder";

        (await PostAsync(client, token, reorderUrl, new ReorderLearningPathItemsRequest(d2.RowVersion, new[] { ids[0] }))).Resp
            .StatusCode.Should().Be(HttpStatusCode.BadRequest); // missing
        (await PostAsync(client, token, reorderUrl, new ReorderLearningPathItemsRequest(d2.RowVersion, new[] { ids[0], ids[0] }))).Resp
            .StatusCode.Should().Be(HttpStatusCode.BadRequest); // duplicate
        (await PostAsync(client, token, reorderUrl, new ReorderLearningPathItemsRequest(d2.RowVersion, new[] { ids[0], ids[1], Guid.NewGuid() }))).Resp
            .StatusCode.Should().Be(HttpStatusCode.BadRequest); // extra
    }

    [Fact]
    public async Task Reorder_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var path = await GetItemAsync(client, token, "draft-path");
        var c1 = await factory.GetCourseIdAsync("python-first-steps");
        var (_, d1) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, c1, null));
        var ids = d1!.Items.Select(i => i.Id).ToList();

        var (resp, _) = await PostAsync(client, token, $"{Url}/{path.Id}/items/reorder",
            new ReorderLearningPathItemsRequest(Convert.ToBase64String(new byte[] { 9 }), ids));
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // --- Authorization -----------------------------------------------------

    [Fact]
    public async Task Anonymous_gets_401()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var resp = await client.PostAsJsonAsync($"{Url}/{Guid.NewGuid()}/items", new AddLearningPathItemRequest("", Guid.NewGuid(), null));
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData(AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Instructor, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Admin, HttpStatusCode.OK)]
    [InlineData(AppRoles.SuperAdmin, HttpStatusCode.OK)]
    public async Task Add_item_authorization_matrix(string role, HttpStatusCode expected)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var admin = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var path = await GetItemAsync(client, admin, "draft-path");
        var course = await factory.GetCourseIdAsync("python-first-steps");

        string token;
        if (role == AppRoles.Parent)
        {
            await factory.RegisterAndVerifyAsync(client, "parent@example.com");
            var (_, login) = await client.LoginAsync("parent@example.com");
            token = login!.AccessToken;
        }
        else if (role == AppRoles.Admin)
        {
            token = admin;
        }
        else
        {
            token = await factory.CreateRoleUserAndLoginAsync(client, $"{role}@example.com", role);
        }

        var (resp, _) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, course, null));
        resp.StatusCode.Should().Be(expected);
    }

    // --- Publish integration -----------------------------------------------

    [Fact]
    public async Task Built_path_with_published_item_can_publish_and_is_public()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var publishedCourse = await factory.GetCourseIdAsync("python-first-steps");

        // Create path via API.
        var create = new CreateLearningPathRequest("Path By Api", "مسار", "Sum", "ملخص", nameof(AgeBand.Explorer), "path-by-api", null);
        var createResp = await client.SendAsync(new HttpRequestMessage(HttpMethod.Post, Url) { Content = JsonContent.Create(create) }.WithBearer(token));
        var created = await createResp.Content.ReadFromJsonAsync<CreateLearningPathResponse>();

        // Add a published-course item.
        var (_, afterAdd) = await PostAsync(client, token, $"{Url}/{created!.Id}/items", new AddLearningPathItemRequest(created.RowVersion, publishedCourse, null));

        // Publish.
        var publish = await client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"{Url}/{created.Id}/publish")
        { Content = JsonContent.Create(new LearningPathLifecycleRequest(afterAdd!.RowVersion)) }.WithBearer(token));
        publish.StatusCode.Should().Be(HttpStatusCode.OK);

        var publicPage = await client.GetFromJsonAsync<PagedResult<LearningPathCardDto>>("/api/v1/catalog/learning-paths?pageSize=100");
        publicPage!.Items.Should().Contain(p => p.Slug == "path-by-api");
    }

    [Fact]
    public async Task Path_with_only_unpublished_item_fails_publish_with_no_published_course()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var draftCourse = await factory.GetCourseIdAsync("draft-course");
        var path = await GetItemAsync(client, token, "draft-path");

        var (_, afterAdd) = await PostAsync(client, token, $"{Url}/{path.Id}/items", new AddLearningPathItemRequest(path.RowVersion, draftCourse, null));

        var publish = await client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"{Url}/{path.Id}/publish")
        { Content = JsonContent.Create(new LearningPathLifecycleRequest(afterAdd!.RowVersion)) }.WithBearer(token));

        publish.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await publish.Content.ReadAsStringAsync()).Should().Contain("no-published-course");
    }
}

using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseModulesTests
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
        var page = await (await client.SendAsync(req)).Content.ReadFromJsonAsync<PagedResult<AdminCourseListItemDto>>();
        return page!.Items.Single(c => c.Slug == slug);
    }

    private static async Task<(HttpResponseMessage Resp, AdminCourseDetailDto? Detail)> PostAsync(
        HttpClient client, string token, string url, object body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) }.WithBearer(token);
        var resp = await client.SendAsync(req);
        var detail = resp.IsSuccessStatusCode ? await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>() : null;
        return (resp, detail);
    }

    private static AddModuleRequest Module(string rowVersion, string titleEn) =>
        new(rowVersion, titleEn, $"{titleEn} ع", "Summary", "ملخص");

    [Fact]
    public async Task Admin_can_add_module_and_it_appears_in_detail()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");

        var (resp, detail) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(item.RowVersion, "Module A"));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        detail!.Modules.Should().ContainSingle(m => m.TitleEn == "Module A");
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseModuleAdded)).Should().Be(1);
    }

    [Fact]
    public async Task Admin_can_update_module()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var (_, added) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(item.RowVersion, "Module A"));
        var moduleId = added!.Modules.Single().Id;

        var update = new UpdateModuleRequest(added.RowVersion, "Module A2", "ع", "S", "س");
        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/courses/{item.Id}/modules/{moduleId}") { Content = JsonContent.Create(update) }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>();
        detail!.Modules.Single().TitleEn.Should().Be("Module A2");
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseModuleUpdated)).Should().Be(1);
    }

    [Fact]
    public async Task Admin_can_remove_module_and_order_is_renumbered()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var (_, d1) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(item.RowVersion, "A"));
        var (_, d2) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(d1!.RowVersion, "B"));
        var firstId = d2!.Modules.OrderBy(m => m.Order).First().Id;

        var (resp, detail) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules/{firstId}/remove", new LifecycleRequest(d2.RowVersion));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        detail!.Modules.Should().ContainSingle(m => m.TitleEn == "B");
        detail.Modules.Single().Order.Should().Be(0);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseModuleRemoved)).Should().Be(1);
    }

    [Fact]
    public async Task Admin_can_reorder_modules()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var (_, d1) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(item.RowVersion, "A"));
        var (_, d2) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(d1!.RowVersion, "B"));
        var (_, d3) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(d2!.RowVersion, "C"));
        var ids = d3!.Modules.OrderBy(m => m.Order).Select(m => m.Id).ToList();
        var reversed = ids.AsEnumerable().Reverse().ToList();

        var (resp, detail) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules/reorder", new ReorderModulesRequest(d3.RowVersion, reversed));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        detail!.Modules.OrderBy(m => m.Order).Select(m => m.Id).Should().Equal(reversed);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseModuleReordered)).Should().Be(1);
    }

    [Fact]
    public async Task Reorder_with_wrong_set_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var (_, d1) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(item.RowVersion, "A"));
        var (_, d2) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(d1!.RowVersion, "B"));
        var ids = d2!.Modules.Select(m => m.Id).ToList();
        var url = $"/api/v1/admin/courses/{item.Id}/modules/reorder";

        // Missing id
        (await PostAsync(client, token, url, new ReorderModulesRequest(d2.RowVersion, new[] { ids[0] }))).Resp
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        // Duplicate id
        (await PostAsync(client, token, url, new ReorderModulesRequest(d2.RowVersion, new[] { ids[0], ids[0] }))).Resp
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        // Extra id
        (await PostAsync(client, token, url, new ReorderModulesRequest(d2.RowVersion, new[] { ids[0], ids[1], Guid.NewGuid() }))).Resp
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_unknown_module_returns_404()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");

        var update = new UpdateModuleRequest(item.RowVersion, "X", null, null, null);
        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/courses/{item.Id}/modules/{Guid.NewGuid()}") { Content = JsonContent.Create(update) }.WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/module-not-found");
    }

    [Fact]
    public async Task Stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules",
            Module(Convert.ToBase64String(new byte[] { 5, 5 }), "A"));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Archived_course_module_add_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "archived-course");

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(item.RowVersion, "A"));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        // archived edits are blocked
    }

    [Theory]
    [InlineData(AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Instructor, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Admin, HttpStatusCode.OK)]
    [InlineData(AppRoles.SuperAdmin, HttpStatusCode.OK)]
    public async Task Add_module_authorization_matrix(string role, HttpStatusCode expected)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var admin = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var item = await GetItemAsync(client, admin, "draft-course");

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

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/modules", Module(item.RowVersion, "M"));
        resp.StatusCode.Should().Be(expected);
    }

    [Fact]
    public async Task Anonymous_gets_401()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync($"/api/v1/admin/courses/{Guid.NewGuid()}/modules", Module("", "M"));

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseListTests
{
    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        return (factory, client, token);
    }

    private static async Task<PagedResult<AdminCourseListItemDto>> ListAsync(HttpClient client, string token, string queryString)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/admin/courses{queryString}").WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.EnsureSuccessStatusCode();
        var page = await resp.Content.ReadFromJsonAsync<PagedResult<AdminCourseListItemDto>>();
        page.Should().NotBeNull();
        return page!;
    }

    [Fact]
    public async Task Lists_all_non_deleted_states_including_unlisted()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var page = await ListAsync(client, token, "");

        // 5 seeded: 2 published+listed, 1 published+unlisted, 1 draft, 1 archived.
        page.TotalItems.Should().Be(5);
        page.Items.Select(c => c.PublishState).Should().Contain(new[] { "Draft", "Published", "Archived" });
        page.Items.Should().Contain(c => c.Slug == "hidden-unlisted" && !c.IsListed);
        page.Items.Should().Contain(c => c.Slug == "draft-course");
        page.Items.Should().Contain(c => c.Slug == "archived-course");
    }

    [Fact]
    public async Task Supports_pagination_with_admin_defaults()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var defaults = await ListAsync(client, token, "");
        defaults.Page.Should().Be(1);
        defaults.PageSize.Should().Be(20);

        var paged = await ListAsync(client, token, "?page=1&pageSize=2");
        paged.PageSize.Should().Be(2);
        paged.Items.Should().HaveCount(2);
        paged.TotalItems.Should().Be(5);
        paged.TotalPages.Should().Be(3);
    }

    [Theory]
    [InlineData("?status=Draft", 1)]
    [InlineData("?status=Published", 3)]
    [InlineData("?status=Archived", 1)]
    [InlineData("?isListed=true", 2)]
    [InlineData("?isListed=false", 3)]
    [InlineData("?deliveryType=Live", 1)]
    [InlineData("?difficulty=Intermediate", 1)]
    [InlineData("?ageBand=Explorer", 2)]
    [InlineData("?ageBand=Junior", 3)]
    [InlineData("?category=python", 4)]
    [InlineData("?category=robotics", 1)]
    [InlineData("?q=Python", 1)]
    [InlineData("?q=Robotics", 1)]
    public async Task Supports_filters(string queryString, int expectedCount)
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var page = await ListAsync(client, token, queryString);

        page.TotalItems.Should().Be(expectedCount);
    }

    [Fact]
    public async Task Invalid_status_filter_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/courses?status=Quantum").WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Invalid_pagination_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/courses?page=0").WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task List_items_carry_raw_bilingual_titles_and_rowversion()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var page = await ListAsync(client, token, "?q=Python");
        var item = page.Items.Single();

        item.TitleEn.Should().Be("Python First Steps");
        item.TitleAr.Should().Be("بايثون الخطوات الأولى");
        item.Category!.Slug.Should().Be("python");
        item.RowVersion.Should().NotBeNull();
    }
}

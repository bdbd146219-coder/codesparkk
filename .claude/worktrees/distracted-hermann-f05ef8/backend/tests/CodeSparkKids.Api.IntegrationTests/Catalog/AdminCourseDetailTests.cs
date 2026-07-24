using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseDetailTests
{
    private static async Task<Guid> FindCourseIdAsync(HttpClient client, string token, string slug)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/courses?pageSize=100").WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.EnsureSuccessStatusCode();
        var page = await resp.Content.ReadFromJsonAsync<PagedResult<AdminCourseListItemDto>>();
        return page!.Items.Single(c => c.Slug == slug).Id;
    }

    private static async Task<HttpResponseMessage> GetDetailAsync(HttpClient client, string token, Guid id)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/admin/courses/{id}").WithBearer(token);
        return await client.SendAsync(req);
    }

    [Fact]
    public async Task Published_course_returns_full_editor_data()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);

        var id = await FindCourseIdAsync(client, token, "python-first-steps");
        var resp = await GetDetailAsync(client, token, id);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>();

        detail!.Slug.Should().Be("python-first-steps");
        // Raw bilingual fields, NOT resolved to a single language.
        detail.TitleEn.Should().Be("Python First Steps");
        detail.TitleAr.Should().Be("بايثون الخطوات الأولى");
        detail.DescriptionEn.Should().Be("Description EN");
        detail.PublishState.Should().Be("Published");
        detail.PrimaryCategoryId.Should().NotBeEmpty();
        detail.Category!.NameEn.Should().Be("Python");
        detail.Modules.Should().ContainSingle();
        detail.Instructors.Should().Contain(i => i.Role == "Lead");
        detail.Outcomes.Should().HaveCount(2);
        detail.Pricing.Model.Should().Be("Free");
        detail.PublishReadiness.IsReady.Should().BeTrue();
        detail.RowVersion.Should().NotBeNull();
    }

    [Fact]
    public async Task Draft_course_detail_reports_unmet_publish_readiness()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);

        var id = await FindCourseIdAsync(client, token, "draft-course");
        var resp = await GetDetailAsync(client, token, id);
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>();
        detail!.PublishState.Should().Be("Draft");
        detail.PublishReadiness.IsReady.Should().BeFalse();
        detail.PublishReadiness.Items.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Unknown_id_returns_404()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);

        var resp = await GetDetailAsync(client, token, Guid.NewGuid());

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var problem = await resp.Content.ReadAsStringAsync();
        problem.Should().Contain("catalog/course-not-found");
    }

    [Fact]
    public async Task Anonymous_and_parent_cannot_access_detail()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var adminToken = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var id = await FindCourseIdAsync(client, adminToken, "python-first-steps");

        var anon = await client.GetAsync($"/api/v1/admin/courses/{id}");
        anon.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        await factory.RegisterAndVerifyAsync(client, "parent@example.com");
        var (_, login) = await client.LoginAsync("parent@example.com");
        var parentResp = await GetDetailAsync(client, login!.AccessToken, id);
        parentResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

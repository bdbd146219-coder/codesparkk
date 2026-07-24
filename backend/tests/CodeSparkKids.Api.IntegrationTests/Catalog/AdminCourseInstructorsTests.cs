using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseInstructorsTests
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

    [Theory]
    [InlineData("Lead")]
    [InlineData("Assistant")]
    public async Task Admin_can_assign_valid_instructor(string role)
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var instructorId = await factory.CreateRoleUserAsync("inst@example.com", AppRoles.Instructor);

        var (resp, detail) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors",
            new AssignInstructorRequest(item.RowVersion, instructorId, role));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        detail!.Instructors.Should().ContainSingle(i => i.InstructorUserId == instructorId && i.Role == role);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseInstructorAssigned)).Should().Be(1);
    }

    [Fact]
    public async Task Parent_user_cannot_be_assigned_as_instructor()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var parentId = await factory.RegisterAndVerifyAsync(client, "parent@example.com");

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors",
            new AssignInstructorRequest(item.RowVersion, parentId, "Lead"));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/invalid-instructor-assignment");
    }

    [Fact]
    public async Task Unknown_user_cannot_be_assigned()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors",
            new AssignInstructorRequest(item.RowVersion, Guid.NewGuid(), "Lead"));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/instructor-not-found");
    }

    [Fact]
    public async Task Invalid_role_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var instructorId = await factory.CreateRoleUserAsync("inst@example.com", AppRoles.Instructor);

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors",
            new AssignInstructorRequest(item.RowVersion, instructorId, "Director"));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Admin_can_remove_instructor()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var instructorId = await factory.CreateRoleUserAsync("inst@example.com", AppRoles.Instructor);
        var (_, assigned) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors",
            new AssignInstructorRequest(item.RowVersion, instructorId, "Lead"));

        var (resp, detail) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors/{instructorId}/remove",
            new LifecycleRequest(assigned!.RowVersion));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        detail!.Instructors.Should().NotContain(i => i.InstructorUserId == instructorId);
        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseInstructorUnassigned)).Should().Be(1);
    }

    [Fact]
    public async Task Remove_unassigned_instructor_returns_404()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors/{Guid.NewGuid()}/remove",
            new LifecycleRequest(item.RowVersion));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Assign_stale_rowVersion_returns_409()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;
        var item = await GetItemAsync(client, token, "draft-course");
        var instructorId = await factory.CreateRoleUserAsync("inst@example.com", AppRoles.Instructor);

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors",
            new AssignInstructorRequest(Convert.ToBase64String(new byte[] { 3, 3 }), instructorId, "Lead"));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Theory]
    [InlineData(AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Instructor, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Admin, HttpStatusCode.OK)]
    [InlineData(AppRoles.SuperAdmin, HttpStatusCode.OK)]
    public async Task Assign_instructor_authorization_matrix(string role, HttpStatusCode expected)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var admin = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var item = await GetItemAsync(client, admin, "draft-course");
        var instructorId = await factory.CreateRoleUserAsync("inst@example.com", AppRoles.Instructor);

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

        var (resp, _) = await PostAsync(client, token, $"/api/v1/admin/courses/{item.Id}/instructors",
            new AssignInstructorRequest(item.RowVersion, instructorId, "Lead"));
        resp.StatusCode.Should().Be(expected);
    }

    [Fact]
    public async Task Full_course_can_be_built_and_published_via_api()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var categoryId = await factory.GetCategoryIdAsync("python");
        var instructorId = await factory.CreateRoleUserAsync("inst@example.com", AppRoles.Instructor);

        // 1. Create draft.
        var create = new CreateCourseRequest("Built By Api", "بُني عبر الواجهة", "built-by-api", categoryId,
            "Recorded", "Beginner", "Junior", 6, 9);
        var createResp = await client.SendAsync(new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/courses")
        { Content = JsonContent.Create(create) }.WithBearer(token));
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResp.Content.ReadFromJsonAsync<CreateCourseResponse>();
        var id = created!.Id;

        // 2. Fill required details (bilingual title/summary, description, thumbnail).
        var update = new UpdateCourseRequest(created.RowVersion, null, "Built By Api", "بُني عبر الواجهة",
            "Sub", "فرعي", "Summary EN", "ملخص", "Description EN", "وصف",
            "Recorded", "Beginner", "Junior", 6, 9, categoryId, false,
            null, new UpdateCourseMediaDto("thumb.png", "alt", null, null), null);
        var updateResp = await client.SendAsync(new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/courses/{id}")
        { Content = JsonContent.Create(update) }.WithBearer(token));
        var afterUpdate = await updateResp.Content.ReadFromJsonAsync<AdminCourseDetailDto>();

        // 3. Add a module.
        var (_, afterModule) = await PostAsync(client, token, $"/api/v1/admin/courses/{id}/modules",
            new AddModuleRequest(afterUpdate!.RowVersion, "Intro", "مقدمة", "S", "س"));

        // 4. Assign a Lead instructor.
        var (_, afterInstructor) = await PostAsync(client, token, $"/api/v1/admin/courses/{id}/instructors",
            new AssignInstructorRequest(afterModule!.RowVersion, instructorId, "Lead"));
        afterInstructor!.PublishReadiness.IsReady.Should().BeTrue();

        // 5. Publish.
        var publish = await client.SendAsync(new HttpRequestMessage(HttpMethod.Post, $"/api/v1/admin/courses/{id}/publish")
        { Content = JsonContent.Create(new LifecycleRequest(afterInstructor.RowVersion)) }.WithBearer(token));
        publish.StatusCode.Should().Be(HttpStatusCode.OK);

        // 6. Appears in the public catalog.
        var publicPage = await client.GetFromJsonAsync<PagedResult<CourseCardDto>>("/api/v1/catalog/courses?pageSize=100");
        publicPage!.Items.Should().Contain(c => c.Slug == "built-by-api");
    }
}

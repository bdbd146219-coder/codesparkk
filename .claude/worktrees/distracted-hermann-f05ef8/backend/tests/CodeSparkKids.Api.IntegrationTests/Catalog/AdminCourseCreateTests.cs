using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseCreateTests
{
    private const string Url = "/api/v1/admin/courses";

    private static CreateCourseRequest ValidRequest(Guid categoryId, string? slug = "new-course") => new(
        TitleEn: "New Course",
        TitleAr: "دورة جديدة",
        Slug: slug,
        PrimaryCategoryId: categoryId,
        DeliveryType: nameof(CourseDeliveryType.Recorded),
        Difficulty: nameof(CourseDifficulty.Beginner),
        AgeBand: nameof(AgeBand.Junior),
        MinAge: 6,
        MaxAge: 9);

    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token, Guid CategoryId)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var categoryId = await factory.GetCategoryIdAsync("python");
        return (factory, client, token, categoryId);
    }

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, string token, CreateCourseRequest body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, Url) { Content = JsonContent.Create(body) }.WithBearer(token);
        return client.SendAsync(req);
    }

    [Fact]
    public async Task Admin_creates_draft_and_it_is_retrievable_but_not_public()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostAsync(client, token, ValidRequest(categoryId));

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        resp.Headers.Location.Should().NotBeNull();
        var created = await resp.Content.ReadFromJsonAsync<CreateCourseResponse>();
        created!.Slug.Should().Be("new-course");
        created.PublishState.Should().Be("Draft");
        created.Id.Should().NotBeEmpty();
        created.RowVersion.Should().NotBeNull();

        // Retrievable via admin detail.
        var detailReq = new HttpRequestMessage(HttpMethod.Get, $"{Url}/{created.Id}").WithBearer(token);
        var detailResp = await client.SendAsync(detailReq);
        detailResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Not visible in the public catalog (it is a draft).
        var publicResp = await client.GetFromJsonAsync<PagedResult<CourseCardDto>>("/api/v1/catalog/courses?pageSize=100");
        publicResp!.Items.Should().NotContain(c => c.Slug == "new-course");

        (await factory.CountAuditEntriesAsync(CourseAuditEventTypes.CourseCreated)).Should().Be(1);
    }

    [Fact]
    public async Task Slug_is_derived_from_title_when_omitted()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostAsync(client, token, ValidRequest(categoryId, slug: null));
        var created = await resp.Content.ReadFromJsonAsync<CreateCourseResponse>();

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        created!.Slug.Should().Be("new-course"); // from "New Course"
    }

    [Fact]
    public async Task Duplicate_slug_returns_409()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostAsync(client, token, ValidRequest(categoryId, slug: "python-first-steps"));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/course-slug-already-exists");
    }

    [Fact]
    public async Task Invalid_slug_returns_400()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostAsync(client, token, ValidRequest(categoryId, slug: "Bad Slug!"));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Unknown_category_returns_404()
    {
        var (factory, client, token, _) = await SetupAsync();
        await using var _f = factory;

        var resp = await PostAsync(client, token, ValidRequest(Guid.NewGuid()));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("catalog/category-not-found");
    }

    [Fact]
    public async Task Inactive_category_returns_404()
    {
        var (factory, client, token, _) = await SetupAsync();
        await using var _f = factory;
        var legacyId = await factory.GetCategoryIdAsync("legacy"); // seeded inactive

        var resp = await PostAsync(client, token, ValidRequest(legacyId));

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Invalid_payload_returns_400()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;

        var bad = ValidRequest(categoryId) with { MinAge = 20, MaxAge = 5 };
        var resp = await PostAsync(client, token, bad);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Anonymous_gets_401()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var categoryId = await factory.GetCategoryIdAsync("python");

        var resp = await client.PostAsJsonAsync(Url, ValidRequest(categoryId));

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData(AppRoles.Parent, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Instructor, HttpStatusCode.Forbidden)]
    [InlineData(AppRoles.Admin, HttpStatusCode.Created)]
    [InlineData(AppRoles.SuperAdmin, HttpStatusCode.Created)]
    public async Task Authorization_matrix(string role, HttpStatusCode expected)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var categoryId = await factory.GetCategoryIdAsync("python");

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

        var resp = await PostAsync(client, token, ValidRequest(categoryId, slug: $"course-{role.ToLowerInvariant()}"));

        resp.StatusCode.Should().Be(expected);
    }
}

using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class CatalogCourseDetailTests
{
    [Fact]
    public async Task Published_slug_returns_detail()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.GetAsync("/api/v1/catalog/courses/python-first-steps");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = await resp.Content.ReadFromJsonAsync<CourseDetailDto>();
        detail!.Slug.Should().Be("python-first-steps");
        detail.Title.Should().Be("Python First Steps");
        detail.Description.Should().Be("Description EN");
        detail.Outcomes.Should().HaveCount(2);
        detail.ModulesPreview.Should().ContainSingle();
        detail.AvailableLocales.Should().BeEquivalentTo("en", "ar");
    }

    [Fact]
    public async Task Published_but_unlisted_slug_is_reachable_directly()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.GetAsync("/api/v1/catalog/courses/hidden-unlisted");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("draft-course")]
    [InlineData("archived-course")]
    [InlineData("does-not-exist")]
    public async Task Hidden_or_unknown_slugs_return_404(string slug)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.GetAsync($"/api/v1/catalog/courses/{slug}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var problem = await resp.Content.ReadAsStringAsync();
        problem.Should().Contain("catalog/course-not-found");
        // Must not leak that hidden content exists.
        problem.Should().NotContain("Draft");
        problem.Should().NotContain("Archived");
    }

    [Fact]
    public async Task Arabic_localization_and_english_fallback_both_work()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var ar = await client.GetFromJsonAsync<CourseDetailDto>("/api/v1/catalog/courses/python-first-steps?lang=ar");
        ar!.Title.Should().Be("بايثون الخطوات الأولى");
        // Subtitle has no Arabic — must fall back to English, never null/empty.
        ar.Subtitle.Should().Be("Subtitle EN");
    }

    [Fact]
    public async Task Accept_language_header_drives_locale_when_no_query_param()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var req = new HttpRequestMessage(HttpMethod.Get, "/api/v1/catalog/courses/python-first-steps");
        req.Headers.Add("Accept-Language", "ar-SA,ar;q=0.9");
        var resp = await client.SendAsync(req);
        var detail = await resp.Content.ReadFromJsonAsync<CourseDetailDto>();
        detail!.Title.Should().Be("بايثون الخطوات الأولى");
    }
}

using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class CatalogLearningPathsTests
{
    [Fact]
    public async Task Lists_only_published_listed_paths()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var page = await client.GetFromJsonAsync<PagedResult<LearningPathCardDto>>("/api/v1/catalog/learning-paths");

        page!.TotalItems.Should().Be(1);
        page.Items[0].Slug.Should().Be("junior-journey");
        page.Items[0].CourseCount.Should().Be(2);
        page.Items.Should().NotContain(p => p.Slug == "draft-path");
    }

    [Fact]
    public async Task Filters_by_age_band()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var junior = await client.GetFromJsonAsync<PagedResult<LearningPathCardDto>>("/api/v1/catalog/learning-paths?ageBand=Junior");
        junior!.TotalItems.Should().Be(1);

        var explorer = await client.GetFromJsonAsync<PagedResult<LearningPathCardDto>>("/api/v1/catalog/learning-paths?ageBand=Explorer");
        explorer!.TotalItems.Should().Be(0);
    }

    [Fact]
    public async Task Detail_returns_ordered_course_cards()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var detail = await client.GetFromJsonAsync<LearningPathDetailDto>("/api/v1/catalog/learning-paths/junior-journey");

        detail!.Slug.Should().Be("junior-journey");
        // Seeded order is [robotics-live, python-first-steps].
        detail.Courses.Select(c => c.Slug).Should().Equal("robotics-live", "python-first-steps");
    }

    [Fact]
    public async Task Draft_path_detail_returns_404()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.GetAsync("/api/v1/catalog/learning-paths/draft-path");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var problem = await resp.Content.ReadAsStringAsync();
        problem.Should().Contain("catalog/learning-path-not-found");
    }
}

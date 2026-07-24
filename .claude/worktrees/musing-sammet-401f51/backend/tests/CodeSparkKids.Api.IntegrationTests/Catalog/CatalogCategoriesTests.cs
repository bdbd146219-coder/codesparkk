using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class CatalogCategoriesTests
{
    private static async Task<IReadOnlyList<CategoryDto>> GetCategories(HttpClient client, string queryString = "")
    {
        var result = await client.GetFromJsonAsync<List<CategoryDto>>($"/api/v1/catalog/categories{queryString}");
        result.Should().NotBeNull();
        return result!;
    }

    [Fact]
    public async Task Returns_active_categories_only_ordered()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var categories = await GetCategories(client);

        categories.Select(c => c.Slug).Should().Equal("python", "robotics");
        categories.Should().NotContain(c => c.Slug == "legacy");
    }

    [Fact]
    public async Task Includes_published_listed_course_counts()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var categories = await GetCategories(client);

        // python has one published+listed course (the unlisted one doesn't count).
        categories.Single(c => c.Slug == "python").PublishedCourseCount.Should().Be(1);
        categories.Single(c => c.Slug == "robotics").PublishedCourseCount.Should().Be(1);
    }

    [Fact]
    public async Task Localizes_names_and_descriptions()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var en = await GetCategories(client, "?lang=en");
        en.Single(c => c.Slug == "python").Name.Should().Be("Python");

        var ar = await GetCategories(client, "?lang=ar");
        ar.Single(c => c.Slug == "python").Name.Should().Be("بايثون");
    }
}

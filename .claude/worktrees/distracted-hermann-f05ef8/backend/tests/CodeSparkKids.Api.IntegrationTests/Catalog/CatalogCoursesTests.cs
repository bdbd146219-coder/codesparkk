using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class CatalogCoursesTests
{
    private static async Task<PagedResult<CourseCardDto>> GetPage(HttpClient client, string queryString)
    {
        var result = await client.GetFromJsonAsync<PagedResult<CourseCardDto>>($"/api/v1/catalog/courses{queryString}");
        result.Should().NotBeNull();
        return result!;
    }

    [Fact]
    public async Task Lists_only_published_and_listed_courses()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var page = await GetPage(client, "");

        page.TotalItems.Should().Be(2);
        page.Items.Select(c => c.Slug).Should().BeEquivalentTo("python-first-steps", "robotics-live");
        page.Items.Should().NotContain(c => c.Slug == "hidden-unlisted");
        page.Items.Should().NotContain(c => c.Slug == "draft-course");
        page.Items.Should().NotContain(c => c.Slug == "archived-course");
    }

    [Fact]
    public async Task Supports_pagination_with_defaults_and_limits()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var page = await GetPage(client, "?page=1&pageSize=1");
        page.PageSize.Should().Be(1);
        page.TotalItems.Should().Be(2);
        page.TotalPages.Should().Be(2);
        page.Items.Should().HaveCount(1);

        var defaults = await GetPage(client, "");
        defaults.Page.Should().Be(1);
        defaults.PageSize.Should().Be(12);
    }

    [Fact]
    public async Task Invalid_pagination_returns_400()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.GetAsync("/api/v1/catalog/courses?page=0");
        resp.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("?ageBand=Junior", "python-first-steps")]
    [InlineData("?ageBand=Explorer", "robotics-live")]
    [InlineData("?deliveryType=Recorded", "python-first-steps")]
    [InlineData("?deliveryType=Live", "robotics-live")]
    [InlineData("?difficulty=Beginner", "python-first-steps")]
    [InlineData("?difficulty=Intermediate", "robotics-live")]
    [InlineData("?category=python", "python-first-steps")]
    [InlineData("?category=robotics", "robotics-live")]
    [InlineData("?age=7", "python-first-steps")]
    [InlineData("?age=12", "robotics-live")]
    [InlineData("?q=Python", "python-first-steps")]
    [InlineData("?q=Robotics", "robotics-live")]
    public async Task Supports_filters(string queryString, string expectedSlug)
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var page = await GetPage(client, queryString);

        page.Items.Should().ContainSingle();
        page.Items[0].Slug.Should().Be(expectedSlug);
    }

    [Fact]
    public async Task Invalid_enum_filter_returns_400()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var resp = await client.GetAsync("/api/v1/catalog/courses?deliveryType=Telepathy");
        resp.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Localizes_card_content_for_en_and_ar()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var en = await GetPage(client, "?lang=en&q=Python");
        en.Items[0].Title.Should().Be("Python First Steps");

        var ar = await GetPage(client, "?lang=ar&q=Python");
        ar.Items[0].Title.Should().Be("بايثون الخطوات الأولى");
    }

    [Fact]
    public async Task Card_exposes_category_pricing_and_outcomes()
    {
        await using var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();

        var page = await GetPage(client, "?q=Python");
        var card = page.Items[0];

        card.Category!.Slug.Should().Be("python");
        card.Pricing.Model.Should().Be("Free");
        card.AgeBand.Should().Be("Junior");
        card.DeliveryType.Should().Be("Recorded");
        card.OutcomesPreview.Should().NotBeEmpty();
        card.Instructors.Should().Contain(i => i.Role == "Lead");
    }
}

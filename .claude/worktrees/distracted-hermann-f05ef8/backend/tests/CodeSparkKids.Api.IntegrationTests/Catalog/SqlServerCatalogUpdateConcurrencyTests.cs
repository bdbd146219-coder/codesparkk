using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

/// <summary>
/// C4J — SQL Server / LocalDB coverage for the catalog update concurrency bug.
///
/// These run against a real LocalDB database (not SQLite) because the bug is
/// invisible on SQLite: <see cref="Infrastructure.Persistence.AppDbContext"/>
/// demotes the RowVersion concurrency token to a no-op on any non-SQL-Server
/// provider, so no optimistic-concurrency check is ever emitted there.
///
/// The bug: updating a course that rewrites its owned <c>CourseOutcomes</c>
/// collection threw a spurious <c>DbUpdateConcurrencyException</c> (→ 409) even
/// when the submitted rowVersion was current, because EF's orphan detection
/// mis-tracked a replaced child as Modified (its UPDATE matched 0 rows). The
/// service now deletes the old rows and inserts the new ones explicitly.
///
/// Before the fix, <see cref="Update_rewriting_outcomes_with_current_rowVersion_succeeds"/>
/// fails (the reproduction); after the fix it passes. Stale-rowVersion protection
/// is asserted to remain intact.
/// </summary>
public class SqlServerCatalogUpdateConcurrencyTests
{
    // A seeded Published course that already has 2 outcomes + media, so an update
    // that replaces its outcomes exercises the delete-old + insert-new path.
    private const string CourseSlug = "python-first-steps";
    private const string PathSlug = "junior-journey";

    private static async Task<(SqlServerCatalogTestFactory Factory, HttpClient Client, string Token, Guid CategoryId)> SetupAsync()
    {
        var factory = new SqlServerCatalogTestFactory();
        await CatalogTestData.SeedAsync(factory);
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        var categoryId = await factory.GetCategoryIdAsync("python");
        return (factory, client, token, categoryId);
    }

    private static async Task<AdminCourseDetailDto> GetCourseAsync(HttpClient client, string token, Guid id)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/admin/courses/{id}").WithBearer(token);
        var resp = await client.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>())!;
    }

    private static Task<HttpResponseMessage> PutCourseAsync(HttpClient client, string token, Guid id, UpdateCourseRequest body)
    {
        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/courses/{id}") { Content = JsonContent.Create(body) }
            .WithBearer(token);
        return client.SendAsync(req);
    }

    private static UpdateCourseRequest BuildCourseUpdate(
        string rowVersion,
        Guid categoryId,
        string titleEn = "Python First Steps",
        UpdateCourseMediaDto? media = null,
        IReadOnlyList<UpdateCourseOutcomeDto>? outcomes = null) => new(
        RowVersion: rowVersion,
        Slug: null,
        TitleEn: titleEn,
        TitleAr: "بايثون الخطوات الأولى",
        SubtitleEn: "Subtitle EN", SubtitleAr: "فرعي",
        SummaryEn: "Summary EN", SummaryAr: "ملخص",
        DescriptionEn: "Description EN", DescriptionAr: "وصف",
        DeliveryType: nameof(CourseDeliveryType.Recorded),
        Difficulty: nameof(CourseDifficulty.Beginner),
        AgeBand: nameof(AgeBand.Junior),
        MinAge: 6, MaxAge: 9,
        PrimaryCategoryId: categoryId,
        IsListed: true, // matches the seeded Published+Listed state (no-op)
        Pricing: null,
        Media: media,
        Outcomes: outcomes);

    // --- The reproduction + fix verification --------------------------------

    [SqlServerFact]
    public async Task Update_rewriting_outcomes_with_current_rowVersion_succeeds()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var id = await factory.GetCourseIdAsync(CourseSlug);

        var before = await GetCourseAsync(client, token, id);
        before.Outcomes.Should().HaveCount(2); // seeded

        var media = new UpdateCourseMediaDto(
            ThumbnailKey: "catalog/courses/python/thumb-v2.png",
            ThumbnailAlt: "Updated thumb",
            HeroKey: "catalog/courses/python/hero-v2.png",
            PromoVideoUrl: null);
        var outcomes = new[]
        {
            new UpdateCourseOutcomeDto("Build a game", "اصنع لعبة"),
            new UpdateCourseOutcomeDto("Debug code", "صحّح الشيفرة"),
            new UpdateCourseOutcomeDto("Think in loops", "فكّر بالحلقات"),
        };

        var resp = await PutCourseAsync(client, token, id,
            BuildCourseUpdate(before.RowVersion, categoryId, titleEn: "Python First Steps v2", media: media, outcomes: outcomes));

        // Before the fix this was 409 Conflict with currentRowVersion == sent.
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = (await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>())!;

        detail.RowVersion.Should().NotBeNullOrEmpty();
        detail.RowVersion.Should().NotBe(before.RowVersion, "a successful save must return a fresh rowVersion");
        detail.TitleEn.Should().Be("Python First Steps v2");
        detail.Media.HeroKey.Should().Be("catalog/courses/python/hero-v2.png");
        detail.Media.ThumbnailKey.Should().Be("catalog/courses/python/thumb-v2.png");
        detail.Outcomes.Should().HaveCount(3);
        detail.Outcomes.OrderBy(o => o.Order).Select(o => o.TextEn)
            .Should().ContainInOrder("Build a game", "Debug code", "Think in loops");

        // Confirm the change persisted across a fresh read (real DB round-trip).
        var reread = await GetCourseAsync(client, token, id);
        reread.Media.HeroKey.Should().Be("catalog/courses/python/hero-v2.png");
        reread.Outcomes.Should().HaveCount(3);
        reread.RowVersion.Should().Be(detail.RowVersion);
    }

    [SqlServerFact]
    public async Task Update_media_only_without_outcomes_with_current_rowVersion_succeeds()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var id = await factory.GetCourseIdAsync(CourseSlug);
        var before = await GetCourseAsync(client, token, id);

        var media = new UpdateCourseMediaDto("catalog/courses/python/thumb-only.png", "Thumb", "catalog/courses/python/hero-only.png", null);
        var resp = await PutCourseAsync(client, token, id,
            BuildCourseUpdate(before.RowVersion, categoryId, media: media, outcomes: null));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = (await resp.Content.ReadFromJsonAsync<AdminCourseDetailDto>())!;
        detail.Media.HeroKey.Should().Be("catalog/courses/python/hero-only.png");
        // Outcomes untouched when the request omits them.
        detail.Outcomes.Should().HaveCount(2);
        detail.RowVersion.Should().NotBe(before.RowVersion);
    }

    // --- Stale-rowVersion protection is preserved ---------------------------

    [SqlServerFact]
    public async Task Stale_rowVersion_still_returns_409_on_SqlServer()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var id = await factory.GetCourseIdAsync(CourseSlug);

        var stale = Convert.ToBase64String(new byte[] { 9, 9, 9, 9, 9, 9, 9, 9 });
        var outcomes = new[] { new UpdateCourseOutcomeDto("X", "س") };
        var resp = await PutCourseAsync(client, token, id, BuildCourseUpdate(stale, categoryId, outcomes: outcomes));

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await resp.Content.ReadAsStringAsync();
        body.Should().Contain("catalog/course-concurrency-conflict");
        body.Should().Contain("currentRowVersion");
        body.Should().NotContain(stale, "the current token must differ from the stale one");
    }

    [SqlServerFact]
    public async Task Two_clients_second_save_conflicts_and_does_not_lose_the_first_update()
    {
        var (factory, client, token, categoryId) = await SetupAsync();
        await using var _ = factory;
        var id = await factory.GetCourseIdAsync(CourseSlug);

        // Both clients read the same version.
        var clientA = await GetCourseAsync(client, token, id);
        var clientB = await GetCourseAsync(client, token, id);
        clientA.RowVersion.Should().Be(clientB.RowVersion);

        // Client A saves first (rewrites outcomes) → succeeds with a fresh token.
        var aResp = await PutCourseAsync(client, token, id, BuildCourseUpdate(
            clientA.RowVersion, categoryId, titleEn: "Saved by A",
            outcomes: new[] { new UpdateCourseOutcomeDto("A outcome", "نتيجة أ") }));
        aResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Client B saves with the now-stale token → 409, no lost update.
        var bResp = await PutCourseAsync(client, token, id, BuildCourseUpdate(
            clientB.RowVersion, categoryId, titleEn: "Saved by B",
            outcomes: new[] { new UpdateCourseOutcomeDto("B outcome", "نتيجة ب") }));
        bResp.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var reread = await GetCourseAsync(client, token, id);
        reread.TitleEn.Should().Be("Saved by A", "client B's stale write must not overwrite client A's save");
        reread.Outcomes.Should().ContainSingle().Which.TextEn.Should().Be("A outcome");
    }

    // --- Learning path parity on SQL Server ---------------------------------

    [SqlServerFact]
    public async Task LearningPath_update_with_current_rowVersion_succeeds_and_stale_conflicts()
    {
        var (factory, client, token, _) = await SetupAsync();
        await using var _f = factory;

        var listReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/learning-paths?pageSize=100").WithBearer(token);
        var listResp = await client.SendAsync(listReq);
        var page = (await listResp.Content.ReadFromJsonAsync<PagedResult<AdminLearningPathListItemDto>>())!;
        var path = page.Items.Single(p => p.Slug == PathSlug);

        var media = new AdminLearningPathMediaDto("catalog/paths/journey-thumb.png", "Journey", "catalog/paths/journey-hero.png", null);
        var body = new UpdateLearningPathRequest(
            RowVersion: path.RowVersion,
            Slug: null,
            TitleEn: "Junior Journey v2",
            TitleAr: "رحلة الصغار",
            SummaryEn: "Updated summary",
            SummaryAr: "ملخص محدّث",
            AgeBand: nameof(AgeBand.Junior),
            IsListed: true,
            Media: media);

        var ok = await client.SendAsync(new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/learning-paths/{path.Id}")
        { Content = JsonContent.Create(body) }.WithBearer(token));
        ok.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = (await ok.Content.ReadFromJsonAsync<AdminLearningPathDetailDto>())!;
        detail.TitleEn.Should().Be("Junior Journey v2");
        detail.Media.HeroKey.Should().Be("catalog/paths/journey-hero.png");
        detail.Items.Should().HaveCount(2, "updating path details must not disturb its items");
        detail.RowVersion.Should().NotBe(path.RowVersion);

        // Stale rowVersion still conflicts.
        var staleBody = body with { RowVersion = Convert.ToBase64String(new byte[] { 1, 1, 1, 1, 1, 1, 1, 1 }) };
        var stale = await client.SendAsync(new HttpRequestMessage(HttpMethod.Put, $"/api/v1/admin/learning-paths/{path.Id}")
        { Content = JsonContent.Create(staleBody) }.WithBearer(token));
        stale.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await stale.Content.ReadAsStringAsync()).Should().Contain("currentRowVersion");
    }
}

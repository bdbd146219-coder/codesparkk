using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Domain.ValueObjects;
using CodeSparkKids.Infrastructure.FileStorage;
using CodeSparkKids.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Api.IntegrationTests.Media;

/// <summary>
/// C4L — admin catalog media orphan cleanup. Runs against a temp storage root
/// (AuthTestFactory's MediaRoot) with a precisely seeded catalog, so every
/// count is deterministic. Covers: live-reference collection (course + path,
/// thumbnail + hero, soft-deleted included, blanks ignored, duplicates
/// deduplicated), dry-run safety (reports, never deletes), grace-period and
/// invalid-key skips, missing-referenced reporting, delete mode, authorization,
/// and the no-path-leak guarantee.
/// </summary>
public class CatalogMediaCleanupTests
{
    private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private const string ReferencedKey = "catalog/courses/python/thumbnail/live.png";
    private const string SharedKey = "catalog/courses/shared/thumbnail/dup.png"; // referenced twice
    private const string SoftDeletedKey = "catalog/courses/gone/hero/protected.png";
    private const string PathHeroKey = "catalog/learning-paths/journey/hero/live.png";
    private const string MissingKey = "catalog/courses/python/hero/missing.png"; // referenced, no file
    private const string OldOrphanKey = "catalog/courses/orphan/thumbnail/old.png";
    private const string YoungOrphanKey = "catalog/courses/orphan/thumbnail/young.png";
    private const string InvalidKey = "catalog/courses/orphan/notes.txt"; // non-image under catalog/

    /// <summary>Distinct live keys the seed produces (SharedKey counted once).</summary>
    private const int ExpectedLiveReferences = 5;

    private static async Task<(AuthTestFactory Factory, HttpClient Client, string Token)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var category = Category.Create("python",
                LocalizedText.Create("Python", "بايثون"),
                LocalizedText.Create("Learn Python", "تعلم بايثون"), "snake", 1, Now);
            db.Categories.Add(category);

            // Course A: a live thumbnail (file exists) + a hero whose file is
            // missing on disk, plus the duplicated key.
            var courseA = Course.Create("course-a", LocalizedText.Create("Course A", "دورة أ"),
                category.Id, CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Junior, 6, 9, Now);
            courseA.UpdateMedia(CourseMedia.Create(ReferencedKey, "alt", MissingKey), Now);

            // Course B: duplicates SharedKey as thumbnail AND hero (dedupe), and
            // is soft-deleted below to prove restorable media stays protected.
            var courseB = Course.Create("course-b", LocalizedText.Create("Course B", "دورة ب"),
                category.Id, CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Junior, 6, 9, Now);
            courseB.UpdateMedia(CourseMedia.Create(SharedKey, null, SharedKey), Now);

            // Course C: soft-deleted with its own hero — must remain protected.
            var courseC = Course.Create("course-c", LocalizedText.Create("Course C", "دورة ج"),
                category.Id, CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Junior, 6, 9, Now);
            courseC.UpdateMedia(CourseMedia.Create(null, null, SoftDeletedKey), Now);
            courseC.SoftDelete(Now);

            // Learning path: whitespace thumbnail (ignored) + a live hero.
            var path = LearningPath.Create("journey", LocalizedText.Create("Journey", "رحلة"), AgeBand.Junior, Now);
            path.UpdateMedia(CourseMedia.Create("   ", null, PathHeroKey), Now);

            db.Courses.AddRange(courseA, courseB, courseC);
            db.LearningPaths.Add(path);
            await db.SaveChangesAsync();
        }

        // Storage layout under the temp media root.
        var old = DateTime.UtcNow.AddHours(-48); // older than the 24 h default grace
        WriteFile(factory, ReferencedKey, old);
        WriteFile(factory, SharedKey, old);
        WriteFile(factory, SoftDeletedKey, old);
        WriteFile(factory, PathHeroKey, old);
        WriteFile(factory, OldOrphanKey, old);
        WriteFile(factory, YoungOrphanKey, DateTime.UtcNow); // inside grace
        WriteFile(factory, InvalidKey, old);
        // Outside the catalog/ prefix — must never be scanned or touched.
        WriteFile(factory, "avatars/outside.png", old);

        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);
        return (factory, client, token);
    }

    private static void WriteFile(AuthTestFactory factory, string key, DateTime lastWriteUtc)
    {
        var path = Path.Combine(factory.MediaRoot, key.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllBytes(path, [0x89, 0x50, 0x4E, 0x47]);
        File.SetLastWriteTimeUtc(path, lastWriteUtc);
    }

    private static bool FileExists(AuthTestFactory factory, string key) =>
        File.Exists(Path.Combine(factory.MediaRoot, key.Replace('/', Path.DirectorySeparatorChar)));

    private static Task<HttpResponseMessage> PostCleanupAsync(HttpClient client, string token, object body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/catalog/media/cleanup")
        { Content = JsonContent.Create(body) }.WithBearer(token);
        return client.SendAsync(req);
    }

    [Fact]
    public async Task Dry_run_reports_orphans_and_deletes_nothing()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostCleanupAsync(client, token, new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = (await resp.Content.ReadFromJsonAsync<CatalogMediaCleanupResult>())!;

        result.DryRun.Should().BeTrue("dry-run must be the default");
        result.GracePeriodHours.Should().Be(24);
        result.LiveReferenceCount.Should().Be(ExpectedLiveReferences,
            "blank keys are ignored and duplicate references collapse to one");
        result.FileCount.Should().Be(7, "only files under catalog/ are scanned");
        result.OrphanCandidateCount.Should().Be(1);
        result.Candidates.Should().ContainSingle().Which.Key.Should().Be(OldOrphanKey);
        result.Candidates[0].Reason.Should().NotBeNullOrWhiteSpace();
        result.DeletedCount.Should().Be(0);
        result.SkippedCount.Should().Be(1, "in dry-run every candidate is skipped");
        result.TooYoungCount.Should().Be(1, "the fresh orphan is inside the grace period");
        result.InvalidKeyCount.Should().Be(1, "the .txt under catalog/ is reported, never deleted");
        result.MissingReferencedCount.Should().Be(1);
        result.MissingReferencedKeys.Should().ContainSingle().Which.Should().Be(MissingKey);

        // Nothing was deleted — including the orphan candidate itself.
        foreach (var key in new[] { ReferencedKey, SharedKey, SoftDeletedKey, PathHeroKey, OldOrphanKey, YoungOrphanKey, InvalidKey })
            FileExists(factory, key).Should().BeTrue($"dry-run must not delete {key}");

        // Response safety: no disk root, no drive path, only relative keys.
        var body = await resp.Content.ReadAsStringAsync();
        body.Should().NotContain(factory.MediaRoot);
        body.Should().NotContainAny(":\\\\", ":\\", "\\\\");
    }

    [Fact]
    public async Task Delete_mode_removes_only_the_eligible_orphan()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        var resp = await PostCleanupAsync(client, token, new { dryRun = false });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = (await resp.Content.ReadFromJsonAsync<CatalogMediaCleanupResult>())!;

        result.DryRun.Should().BeFalse();
        result.OrphanCandidateCount.Should().Be(1);
        result.DeletedCount.Should().Be(1);
        result.SkippedCount.Should().Be(0);

        FileExists(factory, OldOrphanKey).Should().BeFalse("the eligible orphan is deleted");
        // Everything protected stays: referenced, soft-deleted-referenced,
        // duplicated, young, invalid, and files outside catalog/.
        FileExists(factory, ReferencedKey).Should().BeTrue();
        FileExists(factory, SharedKey).Should().BeTrue();
        FileExists(factory, SoftDeletedKey).Should().BeTrue("soft-deleted entities can be restored");
        FileExists(factory, PathHeroKey).Should().BeTrue();
        FileExists(factory, YoungOrphanKey).Should().BeTrue("inside the grace period");
        FileExists(factory, InvalidKey).Should().BeTrue("invalid keys are never deleted");
        FileExists(factory, "avatars/outside.png").Should().BeTrue("outside the catalog/ prefix");
    }

    [Fact]
    public async Task Custom_grace_period_is_honoured()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        // With a 100 h grace even the 48 h-old orphan is too young to touch.
        var resp = await PostCleanupAsync(client, token, new { dryRun = false, gracePeriodHours = 100 });
        var result = (await resp.Content.ReadFromJsonAsync<CatalogMediaCleanupResult>())!;

        result.GracePeriodHours.Should().Be(100);
        result.OrphanCandidateCount.Should().Be(0);
        result.DeletedCount.Should().Be(0);
        result.TooYoungCount.Should().Be(2);
        FileExists(factory, OldOrphanKey).Should().BeTrue();
    }

    [Fact]
    public async Task Out_of_range_grace_period_returns_400()
    {
        var (factory, client, token) = await SetupAsync();
        await using var _ = factory;

        foreach (var bad in new[] { 0, -5, 9000 })
        {
            var resp = await PostCleanupAsync(client, token, new { gracePeriodHours = bad });
            resp.StatusCode.Should().Be(HttpStatusCode.BadRequest, $"gracePeriodHours={bad} must be rejected");
        }
    }

    [Fact]
    public async Task Anonymous_gets_401_and_parent_gets_403()
    {
        var (factory, client, _) = await SetupAsync();
        await using var _f = factory;

        var anon = await client.PostAsJsonAsync("/api/v1/admin/catalog/media/cleanup", new { });
        anon.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        await factory.RegisterAndVerifyAsync(client, "parent@example.com");
        var (_, login) = await client.LoginAsync("parent@example.com");
        var parent = await PostCleanupAsync(client, login!.AccessToken, new { dryRun = false });
        parent.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // The forbidden delete attempt must not have removed the orphan.
        FileExists(factory, OldOrphanKey).Should().BeTrue();
    }
}

/// <summary>
/// C4L — store-level deletion safety: <c>DeleteCatalogFile</c> refuses anything
/// that is not a validated, catalog-prefixed, root-contained key.
/// </summary>
public class LocalDiskCatalogMediaStoreDeleteTests : IDisposable
{
    private readonly string _root;
    private readonly LocalDiskCatalogMediaStore _store;

    public LocalDiskCatalogMediaStoreDeleteTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "csk-c4l-store", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(_root, "catalog", "courses"));
        _store = new LocalDiskCatalogMediaStore(
            Options.Create(new LocalDiskFileStorageOptions { RootPath = _root }));
    }

    private string Write(string relative)
    {
        var path = Path.Combine(_root, relative.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllBytes(path, [1]);
        return path;
    }

    [Theory]
    [InlineData("../escape.png")] // traversal
    [InlineData("catalog/../escape.png")] // traversal within a catalog-looking key
    [InlineData("outside.png")] // not under catalog/
    [InlineData("avatars/outside.png")] // different prefix
    [InlineData("catalog/notes.txt")] // not an allow-listed image type
    [InlineData("")] // blank
    public void Refuses_unsafe_or_non_catalog_keys(string key)
    {
        var escape = Write("escape.png");
        var outside = Write("outside.png");
        var avatar = Write("avatars/outside.png");
        var notes = Write("catalog/notes.txt");

        _store.DeleteCatalogFile(key).Should().BeFalse();

        File.Exists(escape).Should().BeTrue();
        File.Exists(outside).Should().BeTrue();
        File.Exists(avatar).Should().BeTrue();
        File.Exists(notes).Should().BeTrue();
    }

    [Fact]
    public void Deletes_a_valid_catalog_key_and_reports_missing_as_false()
    {
        var file = Write("catalog/courses/a/thumbnail/x.png");

        _store.DeleteCatalogFile("catalog/courses/a/thumbnail/x.png").Should().BeTrue();
        File.Exists(file).Should().BeFalse();

        _store.DeleteCatalogFile("catalog/courses/a/thumbnail/x.png").Should().BeFalse("already gone");
    }

    [Fact]
    public void ListCatalogFiles_only_sees_the_catalog_prefix_and_flags_invalid_keys()
    {
        Write("catalog/courses/a/thumbnail/ok.png");
        Write("catalog/courses/a/notes.txt");
        Write("avatars/outside.png");

        var files = _store.ListCatalogFiles();

        files.Should().HaveCount(2);
        files.Should().ContainSingle(f => f.Key == "catalog/courses/a/thumbnail/ok.png" && f.HasValidKey);
        files.Should().ContainSingle(f => f.Key == "catalog/courses/a/notes.txt" && !f.HasValidKey);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* best effort */ }
    }
}

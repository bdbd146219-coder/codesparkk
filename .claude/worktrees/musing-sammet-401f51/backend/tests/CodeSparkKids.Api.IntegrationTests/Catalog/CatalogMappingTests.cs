using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Domain.ValueObjects;
using CodeSparkKids.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

/// <summary>
/// EF Core mapping tests for the catalog, run against in-memory SQLite. These
/// exercise the same configurations production uses on SQL Server; documented
/// provider differences (RowVersion store-generation) are noted where relevant.
/// </summary>
public sealed class CatalogMappingTests : IDisposable
{
    private readonly SqliteConnection _connection;

    public CatalogMappingTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    private AppDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        var db = new AppDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private static Course BuildCourse(string slug)
    {
        var course = Course.Create(slug, LocalizedText.Create("Title EN", "عنوان"),
            Guid.NewGuid(), CourseDeliveryType.Recorded, CourseDifficulty.Beginner,
            AgeBand.Explorer, 10, 13, Now);
        course.UpdateDetails(
            LocalizedText.Create("Title EN", "عنوان"),
            LocalizedText.Create("Sub", "فرعي"),
            LocalizedText.Create("Summary EN", "ملخص"),
            LocalizedText.Create("Description EN", "وصف"),
            Now);
        course.UpdateMedia(CourseMedia.Create("thumb.png", "alt", "hero.png"), Now);
        course.UpdateOutcomes(new[] { LocalizedText.Create("Outcome", "نتيجة") }, Now);
        course.AddModule(LocalizedText.Create("Module 1", "وحدة"), LocalizedText.Create("s", "س"), Now);
        course.AssignInstructor(Guid.NewGuid(), CourseInstructorRole.Lead, Now);
        return course;
    }

    [Fact]
    public async Task Course_round_trips_with_owned_values_and_children()
    {
        var id = Guid.Empty;
        await using (var db = NewContext())
        {
            var course = BuildCourse("python-first-steps");
            course.Publish(Now);
            db.Courses.Add(course);
            await db.SaveChangesAsync();
            id = course.Id;
        }

        await using (var db = NewContext())
        {
            var loaded = await db.Courses
                .Include(c => c.Modules)
                .Include(c => c.Instructors)
                .Include(c => c.Outcomes)
                .SingleAsync(c => c.Id == id);

            loaded.Slug.Should().Be("python-first-steps");
            loaded.Title.En.Should().Be("Title EN");
            loaded.Title.Ar.Should().Be("عنوان");
            loaded.PublishState.Should().Be(CoursePublishState.Published);
            loaded.Media.ThumbnailKey.Should().Be("thumb.png");
            loaded.Media.HeroKey.Should().Be("hero.png");
            loaded.Pricing.Model.Should().Be(PricingModel.Free);
            loaded.Modules.Should().HaveCount(1);
            loaded.Instructors.Should().ContainSingle(i => i.RoleOnCourse == CourseInstructorRole.Lead);
            loaded.Outcomes.Should().ContainSingle(o => o.Text.En == "Outcome");
        }
    }

    [Fact]
    public async Task Soft_deleted_course_is_filtered_by_default_query()
    {
        var id = Guid.Empty;
        await using (var db = NewContext())
        {
            var course = BuildCourse("to-delete");
            db.Courses.Add(course);
            await db.SaveChangesAsync();
            id = course.Id;

            course.SoftDelete(Now);
            await db.SaveChangesAsync();
        }

        await using (var db = NewContext())
        {
            (await db.Courses.AnyAsync(c => c.Id == id)).Should().BeFalse();
            (await db.Courses.IgnoreQueryFilters().AnyAsync(c => c.Id == id)).Should().BeTrue();
        }
    }

    [Fact]
    public async Task Duplicate_course_slug_violates_unique_index()
    {
        await using var db = NewContext();
        db.Courses.Add(BuildCourse("dup-slug"));
        await db.SaveChangesAsync();

        db.Courses.Add(BuildCourse("dup-slug"));
        var act = async () => await db.SaveChangesAsync();
        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task Cascade_delete_removes_aggregate_children()
    {
        await using var db = NewContext();
        var course = BuildCourse("cascade");
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        db.Courses.Remove(course);
        await db.SaveChangesAsync();

        (await db.Set<CourseModule>().CountAsync()).Should().Be(0);
        (await db.Set<CourseInstructor>().CountAsync()).Should().Be(0);
        (await db.Set<CourseOutcome>().CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Category_and_learning_path_round_trip()
    {
        await using (var db = NewContext())
        {
            db.Categories.Add(Category.Create("python",
                LocalizedText.Create("Python", "بايثون"),
                LocalizedText.Create("Learn Python", "تعلم بايثون"), "snake", 1, Now));

            var path = LearningPath.Create("explorer-track",
                LocalizedText.Create("Explorer Track", "مسار المستكشف"), AgeBand.Explorer, Now);
            path.AddItem(Guid.NewGuid(), "start here", Now);
            path.Publish(Now);
            db.LearningPaths.Add(path);

            await db.SaveChangesAsync();
        }

        await using (var db = NewContext())
        {
            var category = await db.Categories.SingleAsync();
            category.Name.Ar.Should().Be("بايثون");

            var path = await db.LearningPaths.Include(p => p.Items).SingleAsync();
            path.Items.Should().ContainSingle(i => i.Note == "start here");
            path.PublishState.Should().Be(CoursePublishState.Published);
        }
    }

    public void Dispose() => _connection.Dispose();
}

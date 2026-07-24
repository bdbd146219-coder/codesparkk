using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Infrastructure.Persistence;
using CodeSparkKids.Infrastructure.Persistence.Seeding;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

/// <summary>
/// Verifies the development seeder produces the expected catalog and, crucially,
/// is idempotent — running it twice must not duplicate anything.
/// </summary>
public sealed class SeedDataTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public SeedDataTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    private AppDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options;
        var db = new AppDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public async Task Seeder_creates_categories_courses_and_paths_across_states()
    {
        await using var db = NewContext();
        await DevelopmentDataSeeder.SeedAsync(db, Now);

        db.Categories.Count().Should().Be(6);

        var courses = await db.Courses.IgnoreQueryFilters().ToListAsync();
        courses.Count.Should().BeInRange(8, 10);
        courses.Should().Contain(c => c.PublishState == CoursePublishState.Published && c.IsListed);
        courses.Should().Contain(c => c.PublishState == CoursePublishState.Published && !c.IsListed); // unlisted
        courses.Should().Contain(c => c.PublishState == CoursePublishState.Draft);
        courses.Should().Contain(c => c.PublishState == CoursePublishState.Archived);

        // Coverage of age bands and delivery types.
        courses.Select(c => c.AgeBand).Distinct().Should().Contain(new[] { AgeBand.Junior, AgeBand.Explorer });
        courses.Select(c => c.DeliveryType).Distinct().Should()
            .Contain(new[] { CourseDeliveryType.Recorded, CourseDeliveryType.Live, CourseDeliveryType.Hybrid });

        (await db.LearningPaths.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Seeder_is_idempotent()
    {
        await using var db = NewContext();
        await DevelopmentDataSeeder.SeedAsync(db, Now);

        var categories = db.Categories.Count();
        var courses = await db.Courses.IgnoreQueryFilters().CountAsync();
        var paths = await db.LearningPaths.IgnoreQueryFilters().CountAsync();

        // Run again — counts must be unchanged.
        await DevelopmentDataSeeder.SeedAsync(db, Now);

        db.Categories.Count().Should().Be(categories);
        (await db.Courses.IgnoreQueryFilters().CountAsync()).Should().Be(courses);
        (await db.LearningPaths.IgnoreQueryFilters().CountAsync()).Should().Be(paths);
    }

    [Fact]
    public async Task Published_seed_courses_satisfy_the_publish_checklist()
    {
        await using var db = NewContext();
        await DevelopmentDataSeeder.SeedAsync(db, Now);

        var published = await db.Courses.IgnoreQueryFilters()
            .Include(c => c.Modules)
            .Include(c => c.Instructors)
            .Where(c => c.PublishState == CoursePublishState.Published)
            .ToListAsync();

        published.Should().NotBeEmpty();
        published.Should().OnlyContain(c => c.CheckPublishReadiness().IsReady);
    }

    public void Dispose() => _connection.Dispose();
}

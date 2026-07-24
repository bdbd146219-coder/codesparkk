using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Domain.ValueObjects;
using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>
/// Seeds a small, deterministic catalog fixture into a test factory's database
/// so catalog endpoint assertions are precise. Distinct from the development
/// seeder — this fixture is tuned for visibility/filter/localization cases.
/// </summary>
public static class CatalogTestData
{
    private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public static async Task SeedAsync(AuthTestFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var python = Category.Create("python",
            LocalizedText.Create("Python", "بايثون"),
            LocalizedText.Create("Learn Python", "تعلم بايثون"), "snake", 1, Now);
        var robotics = Category.Create("robotics",
            LocalizedText.Create("Robotics", "الروبوتات"),
            LocalizedText.Create("Build robots", "ابنِ الروبوتات"), "robot", 2, Now);
        var legacy = Category.Create("legacy",
            LocalizedText.Create("Legacy", "قديم"),
            LocalizedText.Create("Retired", "متقاعد"), null, 3, Now);
        legacy.Deactivate(Now);
        db.Categories.AddRange(python, robotics, legacy);
        await db.SaveChangesAsync();

        // Published + listed; Recorded/Beginner/Junior/python. Subtitle is
        // English-only on purpose to exercise Arabic→English fallback.
        var pythonCourse = MakePublishable("python-first-steps",
            LocalizedText.Create("Python First Steps", "بايثون الخطوات الأولى"),
            LocalizedText.Create("Subtitle EN", ""),
            python.Id, CourseDeliveryType.Recorded, CourseDifficulty.Beginner,
            AgeBand.Junior, 6, 9, withModule: true);

        // Published + listed; Live/Intermediate/Explorer/robotics.
        var roboticsCourse = MakePublishable("robotics-live",
            LocalizedText.Create("Robotics Live", "روبوتات مباشرة"),
            LocalizedText.Create("Hands-on robots", "روبوتات تطبيقية"),
            robotics.Id, CourseDeliveryType.Live, CourseDifficulty.Intermediate,
            AgeBand.Explorer, 10, 14, withModule: false);

        // Published but UNLISTED — reachable by direct slug, absent from lists.
        var unlisted = MakePublishable("hidden-unlisted",
            LocalizedText.Create("Hidden Course", "دورة مخفية"),
            LocalizedText.Create("Secret", "سري"),
            python.Id, CourseDeliveryType.Recorded, CourseDifficulty.Beginner,
            AgeBand.Explorer, 10, 13, withModule: true);
        unlisted.SetListing(false, Now);

        // Draft — never visible publicly.
        var draft = Course.Create("draft-course", LocalizedText.Create("Draft Course", "مسودة"),
            python.Id, CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Junior, 6, 9, Now);

        // Archived — never visible publicly.
        var archived = MakePublishable("archived-course",
            LocalizedText.Create("Archived Course", "دورة مؤرشفة"),
            LocalizedText.Create("Old", "قديمة"),
            python.Id, CourseDeliveryType.Recorded, CourseDifficulty.Beginner,
            AgeBand.Junior, 6, 9, withModule: true);
        archived.Archive(Now);

        db.Courses.AddRange(pythonCourse, roboticsCourse, unlisted, draft, archived);
        await db.SaveChangesAsync();

        // Published + listed learning path; items ordered [robotics, python].
        var journey = LearningPath.Create("junior-journey",
            LocalizedText.Create("Junior Journey", "رحلة الصغار"), AgeBand.Junior, Now);
        journey.UpdateDetails(
            LocalizedText.Create("Junior Journey", "رحلة الصغار"),
            LocalizedText.Create("A guided path", "مسار موجّه"), AgeBand.Junior, Now);
        journey.AddItem(roboticsCourse.Id, null, Now);
        journey.AddItem(pythonCourse.Id, null, Now);
        journey.Publish(Now);

        var draftPath = LearningPath.Create("draft-path",
            LocalizedText.Create("Draft Path", "مسار مسودة"), AgeBand.Explorer, Now);

        db.LearningPaths.AddRange(journey, draftPath);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Adds a fully publish-ready course that is intentionally left in Draft
    /// state, for exercising the publish endpoint. Does not change the counts
    /// produced by <see cref="SeedAsync"/>. Returns the new course id.
    /// </summary>
    public static async Task<Guid> AddReadyDraftAsync(AuthTestFactory factory, string slug, string categorySlug = "python")
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var categoryId = await db.Categories.Where(c => c.Slug == categorySlug).Select(c => c.Id).SingleAsync();

        var course = BuildReadyCourse(slug,
            LocalizedText.Create("Ready Draft", "مسودة جاهزة"),
            LocalizedText.Create("Subtitle", "فرعي"),
            categoryId, CourseDeliveryType.Recorded, CourseDifficulty.Beginner,
            AgeBand.Junior, 6, 9, withModule: true);

        db.Courses.Add(course);
        await db.SaveChangesAsync();
        return course.Id;
    }

    /// <summary>
    /// Adds a Draft learning path whose single item references the (Draft,
    /// unpublished) "draft-course" — so it is publish-ready on title+items but
    /// fails the "at least one published course" gate. Returns the path id.
    /// Does not change the counts produced by <see cref="SeedAsync"/>.
    /// </summary>
    public static async Task<Guid> AddDraftPathWithUnpublishedItemAsync(AuthTestFactory factory, string slug)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var draftCourseId = await db.Courses.IgnoreQueryFilters()
            .Where(c => c.Slug == "draft-course").Select(c => c.Id).SingleAsync();

        var path = LearningPath.Create(slug, LocalizedText.Create("Unready Path", "مسار غير جاهز"), AgeBand.Explorer, Now);
        path.UpdateDetails(
            LocalizedText.Create("Unready Path", "مسار غير جاهز"),
            LocalizedText.Create("Summary", "ملخص"), AgeBand.Explorer, Now);
        path.AddItem(draftCourseId, null, Now);

        db.LearningPaths.Add(path);
        await db.SaveChangesAsync();
        return path.Id;
    }

    private static Course MakePublishable(
        string slug, LocalizedText title, LocalizedText subtitle, Guid categoryId,
        CourseDeliveryType delivery, CourseDifficulty difficulty,
        AgeBand band, int minAge, int maxAge, bool withModule)
    {
        var course = BuildReadyCourse(slug, title, subtitle, categoryId, delivery, difficulty, band, minAge, maxAge, withModule);
        course.Publish(Now);
        return course;
    }

    private static Course BuildReadyCourse(
        string slug, LocalizedText title, LocalizedText subtitle, Guid categoryId,
        CourseDeliveryType delivery, CourseDifficulty difficulty,
        AgeBand band, int minAge, int maxAge, bool withModule)
    {
        var course = Course.Create(slug, title, categoryId, delivery, difficulty, band, minAge, maxAge, Now);
        course.UpdateDetails(
            title,
            subtitle,
            LocalizedText.Create("Summary EN", "ملخص"),
            LocalizedText.Create("Description EN", "وصف"),
            Now);
        course.UpdateMedia(CourseMedia.Create($"thumb/{slug}.png", "thumb alt", $"hero/{slug}.png"), Now);
        course.UpdateOutcomes(new[]
        {
            LocalizedText.Create("Outcome one", "نتيجة أولى"),
            LocalizedText.Create("Outcome two", "نتيجة ثانية"),
        }, Now);
        if (withModule)
            course.AddModule(LocalizedText.Create("Module 1", "وحدة 1"), LocalizedText.Create("Mod summary", "ملخص"), Now);
        course.AssignInstructor(Guid.NewGuid(), CourseInstructorRole.Lead, Now);
        return course;
    }
}

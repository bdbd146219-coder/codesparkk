using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Tests.Catalog;

public class CourseTests
{
    private static readonly DateTime Now = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly Guid CategoryId = Guid.NewGuid();

    private static Course NewDraft(
        CourseDeliveryType delivery = CourseDeliveryType.Recorded,
        int minAge = 8, int maxAge = 12) =>
        Course.Create("Scratch Adventures", LocalizedText.Create("Scratch Adventures", "مغامرات سكراتش"),
            CategoryId, delivery, CourseDifficulty.Beginner, AgeBand.Junior, minAge, maxAge, Now);

    /// <summary>Builds a course that satisfies the full publish checklist.</summary>
    private static Course NewPublishable(CourseDeliveryType delivery = CourseDeliveryType.Recorded)
    {
        var course = NewDraft(delivery);
        course.UpdateDetails(
            LocalizedText.Create("Scratch Adventures", "مغامرات سكراتش"),
            LocalizedText.Create("Subtitle", "عنوان فرعي"),
            LocalizedText.Create("A fun intro", "مقدمة ممتعة"),
            LocalizedText.Create("Full description", "وصف كامل"),
            Now);
        course.UpdateMedia(CourseMedia.Create("thumb.png", "alt"), Now);
        course.AddModule(LocalizedText.Create("M1", "و1"), LocalizedText.Create("s", "س"), Now);
        course.AssignInstructor(Guid.NewGuid(), CourseInstructorRole.Lead, Now);
        return course;
    }

    [Fact]
    public void Create_starts_in_draft_unlisted_with_normalized_slug()
    {
        var course = NewDraft();
        Assert.Equal("scratch-adventures", course.Slug);
        Assert.Equal(CoursePublishState.Draft, course.PublishState);
        Assert.False(course.IsListed);
        Assert.False(course.IsDeleted);
        Assert.Equal(Now, course.CreatedAt);
        Assert.Equal(CoursePricing.Free(), course.Pricing);
    }

    [Fact]
    public void Create_rejects_inverted_age_range()
    {
        var ex = Assert.Throws<ArgumentException>(() => NewDraft(minAge: 12, maxAge: 8));
        Assert.Contains("MinAge", ex.Message);
    }

    [Fact]
    public void UpdateAgeRange_enforces_min_le_max()
    {
        var course = NewDraft();
        Assert.Throws<ArgumentException>(() => course.UpdateAgeRange(AgeBand.Explorer, 14, 10, Now));
        course.UpdateAgeRange(AgeBand.Explorer, 10, 14, Now);
        Assert.Equal(10, course.MinAge);
        Assert.Equal(14, course.MaxAge);
        Assert.Equal(AgeBand.Explorer, course.AgeBand);
    }

    [Fact]
    public void CheckPublishReadiness_lists_all_missing_pieces_for_bare_draft()
    {
        var course = NewDraft();
        var readiness = course.CheckPublishReadiness();
        Assert.False(readiness.IsReady);
        // Bare draft: missing complete title (Arabic present but summary/desc/thumb/lead/module missing)
        Assert.Contains(PublishRequirement.SummaryIncomplete, readiness.Unmet);
        Assert.Contains(PublishRequirement.DescriptionMissing, readiness.Unmet);
        Assert.Contains(PublishRequirement.ThumbnailMissing, readiness.Unmet);
        Assert.Contains(PublishRequirement.LeadInstructorMissing, readiness.Unmet);
        Assert.Contains(PublishRequirement.ModulesRequired, readiness.Unmet);
    }

    [Fact]
    public void Publish_succeeds_when_checklist_is_satisfied()
    {
        var course = NewPublishable();
        Assert.True(course.CheckPublishReadiness().IsReady);

        course.Publish(Now);

        Assert.Equal(CoursePublishState.Published, course.PublishState);
        Assert.True(course.IsListed);
        Assert.Equal(Now, course.PublishedAt);
    }

    [Fact]
    public void Publish_throws_when_required_data_is_missing()
    {
        var course = NewPublishable();
        course.UpdateMedia(CourseMedia.Empty, Now); // remove thumbnail
        var ex = Assert.Throws<InvalidOperationException>(() => course.Publish(Now));
        Assert.Contains(PublishRequirement.ThumbnailMissing, course.CheckPublishReadiness().Unmet);
        Assert.NotNull(ex);
        Assert.Equal(CoursePublishState.Draft, course.PublishState);
    }

    [Fact]
    public void Recorded_course_requires_a_module_to_publish()
    {
        var course = NewPublishable(CourseDeliveryType.Recorded);
        course.RemoveModule(course.Modules[0].Id, Now);
        Assert.Contains(PublishRequirement.ModulesRequired, course.CheckPublishReadiness().Unmet);
    }

    [Fact]
    public void Live_course_does_not_require_a_module()
    {
        var course = NewPublishable(CourseDeliveryType.Live);
        course.RemoveModule(course.Modules[0].Id, Now);
        Assert.True(course.CheckPublishReadiness().IsReady);
        course.Publish(Now);
        Assert.Equal(CoursePublishState.Published, course.PublishState);
    }

    [Fact]
    public void Archive_then_restore_returns_to_draft()
    {
        var course = NewPublishable();
        course.Publish(Now);

        course.Archive(Now);
        Assert.Equal(CoursePublishState.Archived, course.PublishState);
        Assert.False(course.IsListed);
        Assert.Equal(Now, course.ArchivedAt);

        course.Restore(Now);
        Assert.Equal(CoursePublishState.Draft, course.PublishState);
        Assert.Null(course.ArchivedAt);
    }

    [Fact]
    public void Restore_only_valid_from_archived()
    {
        var course = NewPublishable();
        Assert.Throws<InvalidOperationException>(() => course.Restore(Now));
    }

    [Fact]
    public void SoftDelete_marks_deleted_and_unlists()
    {
        var course = NewPublishable();
        course.Publish(Now);
        course.SoftDelete(Now);
        Assert.True(course.IsDeleted);
        Assert.False(course.IsListed);
        Assert.Equal(Now, course.DeletedAt);
        Assert.Throws<InvalidOperationException>(() => course.Publish(Now));
    }

    [Fact]
    public void Modules_are_ordered_and_resequenced_on_removal()
    {
        var course = NewDraft();
        var m1 = course.AddModule(LocalizedText.Create("A", "أ"), LocalizedText.Empty, Now);
        var m2 = course.AddModule(LocalizedText.Create("B", "ب"), LocalizedText.Empty, Now);
        var m3 = course.AddModule(LocalizedText.Create("C", "ج"), LocalizedText.Empty, Now);
        Assert.Equal(new[] { 0, 1, 2 }, course.Modules.Select(m => m.Order));

        course.ReorderModules(new[] { m3.Id, m1.Id, m2.Id }, Now);
        Assert.Equal(new[] { m3.Id, m1.Id, m2.Id }, course.Modules.Select(m => m.Id));
        Assert.Equal(new[] { 0, 1, 2 }, course.Modules.Select(m => m.Order));

        course.RemoveModule(m1.Id, Now);
        Assert.Equal(2, course.Modules.Count);
        Assert.Equal(new[] { 0, 1 }, course.Modules.Select(m => m.Order));
    }

    [Fact]
    public void Reorder_rejects_mismatched_id_set()
    {
        var course = NewDraft();
        var m1 = course.AddModule(LocalizedText.Create("A", "أ"), LocalizedText.Empty, Now);
        course.AddModule(LocalizedText.Create("B", "ب"), LocalizedText.Empty, Now);
        Assert.Throws<InvalidOperationException>(() => course.ReorderModules(new[] { m1.Id }, Now));
    }

    [Fact]
    public void AssignInstructor_is_idempotent_per_user_and_updates_role()
    {
        var course = NewDraft();
        var userId = Guid.NewGuid();
        course.AssignInstructor(userId, CourseInstructorRole.Assistant, Now);
        course.AssignInstructor(userId, CourseInstructorRole.Lead, Now); // same user, new role

        Assert.Single(course.Instructors);
        Assert.Equal(CourseInstructorRole.Lead, course.Instructors[0].RoleOnCourse);
        Assert.True(course.HasLeadInstructor);
    }

    [Fact]
    public void RemoveInstructor_throws_when_not_assigned()
    {
        var course = NewDraft();
        Assert.Throws<InvalidOperationException>(() => course.RemoveInstructor(Guid.NewGuid(), Now));
    }

    [Fact]
    public void UpdateOutcomes_replaces_and_reorders()
    {
        var course = NewDraft();
        course.UpdateOutcomes(new[]
        {
            LocalizedText.Create("One", "واحد"),
            LocalizedText.Create("Two", "اثنان"),
        }, Now);
        Assert.Equal(new[] { 0, 1 }, course.Outcomes.Select(o => o.Order));

        course.UpdateOutcomes(new[] { LocalizedText.Create("Only", "فقط") }, Now);
        Assert.Single(course.Outcomes);
        Assert.Equal("Only", course.Outcomes[0].Text.En);
    }

    [Fact]
    public void SetListing_requires_published_state()
    {
        var course = NewPublishable();
        Assert.Throws<InvalidOperationException>(() => course.SetListing(true, Now));
        course.Publish(Now);
        course.SetListing(false, Now);
        Assert.False(course.IsListed);
        Assert.Equal(CoursePublishState.Published, course.PublishState);
    }
}

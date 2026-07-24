using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// Aggregate root for a course. Owns its modules, instructors, and outcomes and
/// embeds pricing and media value objects. All mutation flows through methods
/// that take an explicit <c>nowUtc</c> — the domain never reads the clock.
/// Lessons are intentionally out of scope for C1B.
/// </summary>
public sealed class Course
{
    private readonly List<CourseModule> _modules = new();
    private readonly List<CourseInstructor> _instructors = new();
    private readonly List<CourseOutcome> _outcomes = new();

    public Guid Id { get; private set; }
    public string Slug { get; private set; } = string.Empty;
    public LocalizedText Title { get; private set; } = LocalizedText.Empty;
    public LocalizedText Subtitle { get; private set; } = LocalizedText.Empty;
    public LocalizedText Summary { get; private set; } = LocalizedText.Empty;
    public LocalizedText Description { get; private set; } = LocalizedText.Empty;

    public CourseDeliveryType DeliveryType { get; private set; }
    public CourseDifficulty Difficulty { get; private set; }
    public AgeBand AgeBand { get; private set; }
    public int MinAge { get; private set; }
    public int MaxAge { get; private set; }

    public CoursePublishState PublishState { get; private set; }
    public bool IsListed { get; private set; }
    public Guid PrimaryCategoryId { get; private set; }

    public CoursePricing Pricing { get; private set; } = CoursePricing.Free();
    public CourseMedia Media { get; private set; } = CourseMedia.Empty;

    /// <summary>Optimistic-concurrency token (SQL Server <c>rowversion</c>).</summary>
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    public IReadOnlyList<CourseModule> Modules => _modules.AsReadOnly();
    public IReadOnlyList<CourseInstructor> Instructors => _instructors.AsReadOnly();
    public IReadOnlyList<CourseOutcome> Outcomes => _outcomes.AsReadOnly();

    public bool IsDeleted => DeletedAt is not null;

    private Course() { }

    public static Course Create(
        string slug,
        LocalizedText title,
        Guid primaryCategoryId,
        CourseDeliveryType deliveryType,
        CourseDifficulty difficulty,
        AgeBand ageBand,
        int minAge,
        int maxAge,
        DateTime nowUtc)
    {
        if (primaryCategoryId == Guid.Empty)
            throw new ArgumentException("A primary category is required.", nameof(primaryCategoryId));
        GuardAgeRange(minAge, maxAge);

        return new Course
        {
            Id = Guid.NewGuid(),
            Slug = Catalog.Slug.Normalize(slug),
            Title = title ?? LocalizedText.Empty,
            Subtitle = LocalizedText.Empty,
            Summary = LocalizedText.Empty,
            Description = LocalizedText.Empty,
            PrimaryCategoryId = primaryCategoryId,
            DeliveryType = deliveryType,
            Difficulty = difficulty,
            AgeBand = ageBand,
            MinAge = minAge,
            MaxAge = maxAge,
            PublishState = CoursePublishState.Draft,
            IsListed = false,
            Pricing = CoursePricing.Free(),
            Media = CourseMedia.Empty,
            CreatedAt = nowUtc,
            UpdatedAt = nowUtc,
        };
    }

    // --- Detail mutation ---------------------------------------------------

    public void UpdateDetails(
        LocalizedText title,
        LocalizedText subtitle,
        LocalizedText summary,
        LocalizedText description,
        DateTime nowUtc)
    {
        Title = title ?? LocalizedText.Empty;
        Subtitle = subtitle ?? LocalizedText.Empty;
        Summary = summary ?? LocalizedText.Empty;
        Description = description ?? LocalizedText.Empty;
        Touch(nowUtc);
    }

    public void ChangeSlug(string slug, DateTime nowUtc)
    {
        Slug = Catalog.Slug.Normalize(slug);
        Touch(nowUtc);
    }

    public void ChangePrimaryCategory(Guid primaryCategoryId, DateTime nowUtc)
    {
        if (primaryCategoryId == Guid.Empty)
            throw new ArgumentException("A primary category is required.", nameof(primaryCategoryId));
        PrimaryCategoryId = primaryCategoryId;
        Touch(nowUtc);
    }

    public void UpdateAgeRange(AgeBand ageBand, int minAge, int maxAge, DateTime nowUtc)
    {
        GuardAgeRange(minAge, maxAge);
        AgeBand = ageBand;
        MinAge = minAge;
        MaxAge = maxAge;
        Touch(nowUtc);
    }

    public void UpdateDelivery(CourseDeliveryType deliveryType, CourseDifficulty difficulty, DateTime nowUtc)
    {
        DeliveryType = deliveryType;
        Difficulty = difficulty;
        Touch(nowUtc);
    }

    public void UpdateMedia(CourseMedia media, DateTime nowUtc)
    {
        Media = media ?? CourseMedia.Empty;
        Touch(nowUtc);
    }

    public void UpdatePricing(CoursePricing pricing, DateTime nowUtc)
    {
        Pricing = pricing ?? CoursePricing.Free();
        Touch(nowUtc);
    }

    /// <summary>Replaces all outcomes with the supplied texts, re-ordered 0..n.</summary>
    public void UpdateOutcomes(IEnumerable<LocalizedText> outcomes, DateTime nowUtc)
    {
        _outcomes.Clear();
        var order = 0;
        foreach (var text in outcomes)
            _outcomes.Add(CourseOutcome.Create(text, order++));
        Touch(nowUtc);
    }

    // --- Modules -----------------------------------------------------------

    public CourseModule AddModule(LocalizedText title, LocalizedText summary, DateTime nowUtc)
    {
        var module = CourseModule.Create(title, summary, _modules.Count);
        _modules.Add(module);
        Touch(nowUtc);
        return module;
    }

    public void UpdateModule(Guid moduleId, LocalizedText title, LocalizedText summary, DateTime nowUtc)
    {
        var module = _modules.FirstOrDefault(m => m.Id == moduleId)
            ?? throw new InvalidOperationException($"Module {moduleId} is not part of this course.");
        module.Update(title, summary);
        Touch(nowUtc);
    }

    public void RemoveModule(Guid moduleId, DateTime nowUtc)
    {
        var module = _modules.FirstOrDefault(m => m.Id == moduleId)
            ?? throw new InvalidOperationException($"Module {moduleId} is not part of this course.");
        _modules.Remove(module);
        Resequence(_modules);
        Touch(nowUtc);
    }

    /// <summary>
    /// Reorders modules to match <paramref name="orderedModuleIds"/>. The set of
    /// ids must exactly match the course's current modules.
    /// </summary>
    public void ReorderModules(IReadOnlyList<Guid> orderedModuleIds, DateTime nowUtc)
    {
        if (orderedModuleIds.Count != _modules.Count ||
            orderedModuleIds.Distinct().Count() != _modules.Count ||
            !orderedModuleIds.All(id => _modules.Any(m => m.Id == id)))
        {
            throw new InvalidOperationException("Reorder list must contain exactly the course's current module ids.");
        }

        for (var i = 0; i < orderedModuleIds.Count; i++)
            _modules.First(m => m.Id == orderedModuleIds[i]).SetOrder(i);

        _modules.Sort((a, b) => a.Order.CompareTo(b.Order));
        Touch(nowUtc);
    }

    // --- Instructors -------------------------------------------------------

    public CourseInstructor AssignInstructor(Guid instructorUserId, CourseInstructorRole role, DateTime nowUtc)
    {
        var existing = _instructors.FirstOrDefault(i => i.InstructorUserId == instructorUserId);
        if (existing is not null)
        {
            existing.SetRole(role);
            Touch(nowUtc);
            return existing;
        }

        var instructor = CourseInstructor.Create(instructorUserId, role);
        _instructors.Add(instructor);
        Touch(nowUtc);
        return instructor;
    }

    public void RemoveInstructor(Guid instructorUserId, DateTime nowUtc)
    {
        var instructor = _instructors.FirstOrDefault(i => i.InstructorUserId == instructorUserId)
            ?? throw new InvalidOperationException("Instructor is not assigned to this course.");
        _instructors.Remove(instructor);
        Touch(nowUtc);
    }

    public bool HasLeadInstructor => _instructors.Any(i => i.RoleOnCourse == CourseInstructorRole.Lead);

    // --- Publish lifecycle -------------------------------------------------

    /// <summary>
    /// Evaluates the publish checklist without changing state. Note that
    /// <see cref="AgeBand"/>, <see cref="Difficulty"/>, and
    /// <see cref="DeliveryType"/> are non-nullable enums, so "exists" for those
    /// is guaranteed by the type system rather than checked here.
    /// </summary>
    public PublishReadiness CheckPublishReadiness()
    {
        var unmet = new List<PublishRequirement>();

        if (!Title.IsComplete)
            unmet.Add(PublishRequirement.TitleIncomplete);
        if (!Summary.IsComplete)
            unmet.Add(PublishRequirement.SummaryIncomplete);
        if (!Description.HasAny)
            unmet.Add(PublishRequirement.DescriptionMissing);
        if (PrimaryCategoryId == Guid.Empty)
            unmet.Add(PublishRequirement.PrimaryCategoryMissing);
        if (MinAge > MaxAge)
            unmet.Add(PublishRequirement.AgeRangeInvalid);
        if (!Catalog.Slug.IsValid(Slug))
            unmet.Add(PublishRequirement.SlugInvalid);
        if (!Media.HasThumbnail)
            unmet.Add(PublishRequirement.ThumbnailMissing);
        if (!HasLeadInstructor)
            unmet.Add(PublishRequirement.LeadInstructorMissing);
        if (DeliveryType is CourseDeliveryType.Recorded or CourseDeliveryType.Hybrid && _modules.Count == 0)
            unmet.Add(PublishRequirement.ModulesRequired);

        return new PublishReadiness(unmet);
    }

    public void Publish(DateTime nowUtc)
    {
        if (IsDeleted)
            throw new InvalidOperationException("A deleted course cannot be published.");

        var readiness = CheckPublishReadiness();
        if (!readiness.IsReady)
            throw new InvalidOperationException(
                "Course is not ready to publish: " + string.Join(", ", readiness.Unmet));

        PublishState = CoursePublishState.Published;
        PublishedAt = nowUtc;
        ArchivedAt = null;
        IsListed = true;
        Touch(nowUtc);
    }

    /// <summary>Returns a published/in-review course to draft.</summary>
    public void ReturnToDraft(DateTime nowUtc)
    {
        if (PublishState == CoursePublishState.Archived)
            throw new InvalidOperationException("Restore an archived course before returning it to draft.");
        PublishState = CoursePublishState.Draft;
        IsListed = false;
        Touch(nowUtc);
    }

    /// <summary>Controls public listing without changing the publish state.</summary>
    public void SetListing(bool isListed, DateTime nowUtc)
    {
        if (isListed && PublishState != CoursePublishState.Published)
            throw new InvalidOperationException("Only a published course can be listed.");
        IsListed = isListed;
        Touch(nowUtc);
    }

    public void Archive(DateTime nowUtc)
    {
        if (PublishState == CoursePublishState.Archived) return;
        PublishState = CoursePublishState.Archived;
        ArchivedAt = nowUtc;
        IsListed = false;
        Touch(nowUtc);
    }

    public void Restore(DateTime nowUtc)
    {
        if (PublishState != CoursePublishState.Archived)
            throw new InvalidOperationException("Only an archived course can be restored.");
        PublishState = CoursePublishState.Draft;
        ArchivedAt = null;
        Touch(nowUtc);
    }

    public void SoftDelete(DateTime nowUtc)
    {
        if (IsDeleted) return;
        DeletedAt = nowUtc;
        IsListed = false;
        Touch(nowUtc);
    }

    // --- Helpers -----------------------------------------------------------

    private void Touch(DateTime nowUtc) => UpdatedAt = nowUtc;

    private static void GuardAgeRange(int minAge, int maxAge)
    {
        if (minAge < 0)
            throw new ArgumentOutOfRangeException(nameof(minAge), "MinAge cannot be negative.");
        if (minAge > maxAge)
            throw new ArgumentException("MinAge must be less than or equal to MaxAge.", nameof(minAge));
    }

    private static void Resequence(List<CourseModule> modules)
    {
        for (var i = 0; i < modules.Count; i++)
            modules[i].SetOrder(i);
    }
}

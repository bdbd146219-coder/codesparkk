using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// A curated, ordered sequence of courses (e.g. "Junior Coder Journey"). Root
/// aggregate that owns its <see cref="LearningPathItem"/> list. Soft-deletable
/// and publishable, mirroring the course lifecycle but lighter.
/// </summary>
public sealed class LearningPath
{
    private readonly List<LearningPathItem> _items = new();

    public Guid Id { get; private set; }
    public string Slug { get; private set; } = string.Empty;
    public LocalizedText Title { get; private set; } = LocalizedText.Empty;
    public LocalizedText Summary { get; private set; } = LocalizedText.Empty;
    public AgeBand AgeBand { get; private set; }
    public CoursePublishState PublishState { get; private set; }
    public bool IsListed { get; private set; }
    public CourseMedia Media { get; private set; } = CourseMedia.Empty;

    /// <summary>Optimistic-concurrency token (SQL Server <c>rowversion</c>).</summary>
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    public IReadOnlyList<LearningPathItem> Items => _items.AsReadOnly();
    public bool IsDeleted => DeletedAt is not null;

    private LearningPath() { }

    public static LearningPath Create(string slug, LocalizedText title, AgeBand ageBand, DateTime nowUtc) =>
        new()
        {
            Id = Guid.NewGuid(),
            Slug = Catalog.Slug.Normalize(slug),
            Title = title ?? LocalizedText.Empty,
            Summary = LocalizedText.Empty,
            AgeBand = ageBand,
            PublishState = CoursePublishState.Draft,
            IsListed = false,
            Media = CourseMedia.Empty,
            CreatedAt = nowUtc,
            UpdatedAt = nowUtc,
        };

    public void UpdateDetails(LocalizedText title, LocalizedText summary, AgeBand ageBand, DateTime nowUtc)
    {
        Title = title ?? LocalizedText.Empty;
        Summary = summary ?? LocalizedText.Empty;
        AgeBand = ageBand;
        UpdatedAt = nowUtc;
    }

    public void ChangeSlug(string slug, DateTime nowUtc)
    {
        Slug = Catalog.Slug.Normalize(slug);
        UpdatedAt = nowUtc;
    }

    public void UpdateMedia(CourseMedia media, DateTime nowUtc)
    {
        Media = media ?? CourseMedia.Empty;
        UpdatedAt = nowUtc;
    }

    public LearningPathItem AddItem(Guid courseId, string? note, DateTime nowUtc)
    {
        var item = LearningPathItem.Create(courseId, _items.Count, note);
        _items.Add(item);
        UpdatedAt = nowUtc;
        return item;
    }

    public void RemoveItem(Guid itemId, DateTime nowUtc)
    {
        var item = _items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new InvalidOperationException("Item is not part of this learning path.");
        _items.Remove(item);
        for (var i = 0; i < _items.Count; i++)
            _items[i].SetOrder(i);
        UpdatedAt = nowUtc;
    }

    public void ReorderItems(IReadOnlyList<Guid> orderedItemIds, DateTime nowUtc)
    {
        if (orderedItemIds.Count != _items.Count ||
            orderedItemIds.Distinct().Count() != _items.Count ||
            !orderedItemIds.All(id => _items.Any(i => i.Id == id)))
        {
            throw new InvalidOperationException("Reorder list must contain exactly the path's current item ids.");
        }

        for (var i = 0; i < orderedItemIds.Count; i++)
            _items.First(x => x.Id == orderedItemIds[i]).SetOrder(i);

        _items.Sort((a, b) => a.Order.CompareTo(b.Order));
        UpdatedAt = nowUtc;
    }

    /// <summary>
    /// Evaluates the aggregate-checkable publish requirements (title, item
    /// count). The application service additionally checks
    /// <see cref="LearningPathRequirement.NoPublishedCourse"/>, which depends on
    /// course publish state outside this aggregate.
    /// </summary>
    public LearningPathReadiness CheckPublishReadiness()
    {
        var unmet = new List<LearningPathRequirement>();
        if (!Title.IsComplete)
            unmet.Add(LearningPathRequirement.TitleIncomplete);
        if (_items.Count == 0)
            unmet.Add(LearningPathRequirement.NoItems);
        return new LearningPathReadiness(unmet);
    }

    public void Publish(DateTime nowUtc)
    {
        if (IsDeleted)
            throw new InvalidOperationException("A deleted learning path cannot be published.");

        var readiness = CheckPublishReadiness();
        if (!readiness.IsReady)
            throw new InvalidOperationException(
                "Learning path is not ready to publish: " + string.Join(", ", readiness.Unmet));

        PublishState = CoursePublishState.Published;
        PublishedAt = nowUtc;
        ArchivedAt = null;
        IsListed = true;
        UpdatedAt = nowUtc;
    }

    /// <summary>Returns a published/in-review path to draft.</summary>
    public void ReturnToDraft(DateTime nowUtc)
    {
        if (PublishState == CoursePublishState.Archived)
            throw new InvalidOperationException("Restore an archived learning path before returning it to draft.");
        PublishState = CoursePublishState.Draft;
        IsListed = false;
        UpdatedAt = nowUtc;
    }

    public void Archive(DateTime nowUtc)
    {
        if (PublishState == CoursePublishState.Archived) return;
        PublishState = CoursePublishState.Archived;
        ArchivedAt = nowUtc;
        IsListed = false;
        UpdatedAt = nowUtc;
    }

    public void Restore(DateTime nowUtc)
    {
        if (PublishState != CoursePublishState.Archived)
            throw new InvalidOperationException("Only an archived learning path can be restored.");
        PublishState = CoursePublishState.Draft;
        ArchivedAt = null;
        UpdatedAt = nowUtc;
    }

    public void SetListing(bool isListed, DateTime nowUtc)
    {
        if (isListed && PublishState != CoursePublishState.Published)
            throw new InvalidOperationException("Only a published learning path can be listed.");
        IsListed = isListed;
        UpdatedAt = nowUtc;
    }

    public void SoftDelete(DateTime nowUtc)
    {
        if (IsDeleted) return;
        DeletedAt = nowUtc;
        IsListed = false;
        UpdatedAt = nowUtc;
    }
}

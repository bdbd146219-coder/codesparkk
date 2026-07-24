using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// A module (section) within a <see cref="Course"/>. Part of the Course
/// aggregate — created, ordered, and removed only through Course methods, never
/// independently. Lessons inside modules are deferred to a later task.
/// </summary>
public sealed class CourseModule
{
    public Guid Id { get; private set; }
    public LocalizedText Title { get; private set; } = LocalizedText.Empty;
    public LocalizedText Summary { get; private set; } = LocalizedText.Empty;
    public int Order { get; private set; }

    private CourseModule() { }

    internal static CourseModule Create(LocalizedText title, LocalizedText summary, int order) =>
        new()
        {
            Id = Guid.NewGuid(),
            Title = title ?? LocalizedText.Empty,
            Summary = summary ?? LocalizedText.Empty,
            Order = order,
        };

    internal void Update(LocalizedText title, LocalizedText summary)
    {
        Title = title ?? LocalizedText.Empty;
        Summary = summary ?? LocalizedText.Empty;
    }

    internal void SetOrder(int order) => Order = order;
}

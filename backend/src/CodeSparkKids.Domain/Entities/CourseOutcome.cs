using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// A single learning outcome ("what you'll learn") for a <see cref="Course"/>.
/// Bilingual and ordered. Part of the Course aggregate — replaced wholesale via
/// <see cref="Course.UpdateOutcomes"/>.
/// </summary>
public sealed class CourseOutcome
{
    public Guid Id { get; private set; }
    public LocalizedText Text { get; private set; } = LocalizedText.Empty;
    public int Order { get; private set; }

    private CourseOutcome() { }

    internal static CourseOutcome Create(LocalizedText text, int order) =>
        new()
        {
            Id = Guid.NewGuid(),
            Text = text ?? LocalizedText.Empty,
            Order = order,
        };
}

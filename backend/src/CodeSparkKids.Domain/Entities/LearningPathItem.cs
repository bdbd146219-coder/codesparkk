namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// An ordered reference to a <see cref="Course"/> within a
/// <see cref="LearningPath"/>. Part of the LearningPath aggregate.
/// <see cref="CourseId"/> is a plain reference — no database foreign key is
/// enforced so a course can be soft-deleted without cascading into paths.
/// </summary>
public sealed class LearningPathItem
{
    public Guid Id { get; private set; }
    public Guid CourseId { get; private set; }
    public int Order { get; private set; }
    public string? Note { get; private set; }

    private LearningPathItem() { }

    internal static LearningPathItem Create(Guid courseId, int order, string? note)
    {
        if (courseId == Guid.Empty)
            throw new ArgumentException("Course id is required.", nameof(courseId));

        return new LearningPathItem
        {
            Id = Guid.NewGuid(),
            CourseId = courseId,
            Order = order,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        };
    }

    internal void SetOrder(int order) => Order = order;
}

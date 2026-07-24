using CodeSparkKids.Domain.Catalog;

namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// Assignment of an instructor (an Identity user) to a <see cref="Course"/> with
/// a role. Part of the Course aggregate. <see cref="InstructorUserId"/> is a
/// plain reference to a user id — no foreign key is enforced at the database
/// level so the catalog stays decoupled from the Identity tables.
/// </summary>
public sealed class CourseInstructor
{
    public Guid Id { get; private set; }
    public Guid InstructorUserId { get; private set; }
    public CourseInstructorRole RoleOnCourse { get; private set; }

    private CourseInstructor() { }

    internal static CourseInstructor Create(Guid instructorUserId, CourseInstructorRole role)
    {
        if (instructorUserId == Guid.Empty)
            throw new ArgumentException("Instructor user id is required.", nameof(instructorUserId));

        return new CourseInstructor
        {
            Id = Guid.NewGuid(),
            InstructorUserId = instructorUserId,
            RoleOnCourse = role,
        };
    }

    internal void SetRole(CourseInstructorRole role) => RoleOnCourse = role;
}

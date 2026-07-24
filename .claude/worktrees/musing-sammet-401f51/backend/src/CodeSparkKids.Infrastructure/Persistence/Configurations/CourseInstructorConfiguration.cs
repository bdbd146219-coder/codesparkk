using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class CourseInstructorConfiguration : IEntityTypeConfiguration<CourseInstructor>
{
    public void Configure(EntityTypeBuilder<CourseInstructor> b)
    {
        b.ToTable("CourseInstructors");
        b.HasKey(x => x.Id);

        b.Property(x => x.InstructorUserId).IsRequired();
        b.Property(x => x.RoleOnCourse).IsRequired().HasConversion<int>();

        // One assignment per (course, instructor). Shadow FK "CourseId" comes
        // from the Course → Instructors relationship.
        b.HasIndex("CourseId", nameof(CourseInstructor.InstructorUserId)).IsUnique();
    }
}

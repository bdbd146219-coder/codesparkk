using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class LearningPathItemConfiguration : IEntityTypeConfiguration<LearningPathItem>
{
    public void Configure(EntityTypeBuilder<LearningPathItem> b)
    {
        b.ToTable("LearningPathItems");
        b.HasKey(x => x.Id);

        b.Property(x => x.CourseId).IsRequired();
        b.Property(x => x.Order).IsRequired();
        b.Property(x => x.Note).HasMaxLength(300);

        // Shadow FK "LearningPathId" comes from the LearningPath → Items relationship.
        b.HasIndex("LearningPathId", nameof(LearningPathItem.Order));
        b.HasIndex(x => x.CourseId);
    }
}

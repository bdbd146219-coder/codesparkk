using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class CourseOutcomeConfiguration : IEntityTypeConfiguration<CourseOutcome>
{
    public void Configure(EntityTypeBuilder<CourseOutcome> b)
    {
        b.ToTable("CourseOutcomes");
        b.HasKey(x => x.Id);

        b.OwnsOne(x => x.Text, t => t.ConfigureLocalizedText("Text", 300));
        b.Navigation(x => x.Text).IsRequired();

        b.Property(x => x.Order).IsRequired();

        b.HasIndex("CourseId", nameof(CourseOutcome.Order));
    }
}

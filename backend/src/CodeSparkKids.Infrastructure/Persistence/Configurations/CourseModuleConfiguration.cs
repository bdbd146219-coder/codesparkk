using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class CourseModuleConfiguration : IEntityTypeConfiguration<CourseModule>
{
    public void Configure(EntityTypeBuilder<CourseModule> b)
    {
        b.ToTable("CourseModules");
        b.HasKey(x => x.Id);

        b.OwnsOne(x => x.Title, t => t.ConfigureLocalizedText("Title", 160));
        b.OwnsOne(x => x.Summary, t => t.ConfigureLocalizedText("Summary", 1000));
        b.Navigation(x => x.Title).IsRequired();
        b.Navigation(x => x.Summary).IsRequired();

        b.Property(x => x.Order).IsRequired();

        // Shadow FK "CourseId" is defined by the Course → Modules relationship.
        b.HasIndex("CourseId", nameof(CourseModule.Order));
    }
}

using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class LearningPathConfiguration : IEntityTypeConfiguration<LearningPath>
{
    public void Configure(EntityTypeBuilder<LearningPath> b)
    {
        b.ToTable("LearningPaths");
        b.HasKey(x => x.Id);

        b.Property(x => x.Slug).IsRequired().HasMaxLength(80);
        b.HasIndex(x => x.Slug).IsUnique();

        b.OwnsOne(x => x.Title, t => t.ConfigureLocalizedText("Title", 160));
        b.OwnsOne(x => x.Summary, t => t.ConfigureLocalizedText("Summary", 500));
        b.Navigation(x => x.Title).IsRequired();
        b.Navigation(x => x.Summary).IsRequired();

        b.Property(x => x.AgeBand).IsRequired().HasConversion<int>();
        b.Property(x => x.PublishState).IsRequired().HasConversion<int>();
        b.Property(x => x.IsListed).IsRequired();
        b.Property(x => x.RowVersion).IsRowVersion();

        b.OwnsOne(x => x.Media, m =>
        {
            m.Property(p => p.ThumbnailKey).HasColumnName("Media_ThumbnailKey").HasMaxLength(256);
            m.Property(p => p.ThumbnailAlt).HasColumnName("Media_ThumbnailAlt").HasMaxLength(256);
            m.Property(p => p.HeroKey).HasColumnName("Media_HeroKey").HasMaxLength(256);
            m.Property(p => p.PromoVideoUrl).HasColumnName("Media_PromoVideoUrl").HasMaxLength(512);
        });
        b.Navigation(x => x.Media).IsRequired();

        b.Property(x => x.CreatedAt).IsRequired();
        b.Property(x => x.UpdatedAt).IsRequired();
        b.Property(x => x.PublishedAt);
        b.Property(x => x.ArchivedAt);
        b.Property(x => x.DeletedAt);

        b.HasMany(x => x.Items)
            .WithOne()
            .HasForeignKey("LearningPathId")
            .OnDelete(DeleteBehavior.Cascade);
        b.Navigation(x => x.Items).UsePropertyAccessMode(PropertyAccessMode.Field);

        b.HasIndex(x => new { x.PublishState, x.IsListed });
        b.HasIndex(x => x.DeletedAt);

        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}

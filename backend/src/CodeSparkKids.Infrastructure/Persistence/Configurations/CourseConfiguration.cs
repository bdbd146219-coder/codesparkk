using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class CourseConfiguration : IEntityTypeConfiguration<Course>
{
    public void Configure(EntityTypeBuilder<Course> b)
    {
        b.ToTable("Courses");
        b.HasKey(x => x.Id);

        b.Property(x => x.Slug).IsRequired().HasMaxLength(80);
        b.HasIndex(x => x.Slug).IsUnique();

        // --- Bilingual text (owned, two columns each) ----------------------
        b.OwnsOne(x => x.Title, t => t.ConfigureLocalizedText("Title", 160));
        b.OwnsOne(x => x.Subtitle, t => t.ConfigureLocalizedText("Subtitle", 200));
        b.OwnsOne(x => x.Summary, t => t.ConfigureLocalizedText("Summary", 500));
        b.OwnsOne(x => x.Description, t => t.ConfigureLocalizedText("Description", 4000));
        b.Navigation(x => x.Title).IsRequired();
        b.Navigation(x => x.Subtitle).IsRequired();
        b.Navigation(x => x.Summary).IsRequired();
        b.Navigation(x => x.Description).IsRequired();

        // --- Scalars / enums (stored as int) -------------------------------
        b.Property(x => x.DeliveryType).IsRequired().HasConversion<int>();
        b.Property(x => x.Difficulty).IsRequired().HasConversion<int>();
        b.Property(x => x.AgeBand).IsRequired().HasConversion<int>();
        b.Property(x => x.MinAge).IsRequired();
        b.Property(x => x.MaxAge).IsRequired();
        b.Property(x => x.PublishState).IsRequired().HasConversion<int>();
        b.Property(x => x.IsListed).IsRequired();
        b.Property(x => x.PrimaryCategoryId).IsRequired();

        // --- Pricing (owned) -----------------------------------------------
        b.OwnsOne(x => x.Pricing, p =>
        {
            p.Property(x => x.Model).HasColumnName("Pricing_Model").HasConversion<int>().IsRequired();
            p.Property(x => x.Amount).HasColumnName("Pricing_Amount").HasPrecision(10, 2);
            p.Property(x => x.Currency).HasColumnName("Pricing_Currency").HasMaxLength(3);
        });
        b.Navigation(x => x.Pricing).IsRequired();

        // --- Media (owned) -------------------------------------------------
        b.OwnsOne(x => x.Media, m =>
        {
            m.Property(x => x.ThumbnailKey).HasColumnName("Media_ThumbnailKey").HasMaxLength(256);
            m.Property(x => x.ThumbnailAlt).HasColumnName("Media_ThumbnailAlt").HasMaxLength(256);
            m.Property(x => x.HeroKey).HasColumnName("Media_HeroKey").HasMaxLength(256);
            m.Property(x => x.PromoVideoUrl).HasColumnName("Media_PromoVideoUrl").HasMaxLength(512);
        });
        b.Navigation(x => x.Media).IsRequired();

        // --- Concurrency + lifecycle timestamps ----------------------------
        b.Property(x => x.RowVersion).IsRowVersion();
        b.Property(x => x.CreatedAt).IsRequired();
        b.Property(x => x.UpdatedAt).IsRequired();
        b.Property(x => x.PublishedAt);
        b.Property(x => x.ArchivedAt);
        b.Property(x => x.DeletedAt);

        // --- Aggregate children (no DbSet; reached via the root) -----------
        b.HasMany(x => x.Modules)
            .WithOne()
            .HasForeignKey("CourseId")
            .OnDelete(DeleteBehavior.Cascade);
        b.Navigation(x => x.Modules).UsePropertyAccessMode(PropertyAccessMode.Field);

        b.HasMany(x => x.Instructors)
            .WithOne()
            .HasForeignKey("CourseId")
            .OnDelete(DeleteBehavior.Cascade);
        b.Navigation(x => x.Instructors).UsePropertyAccessMode(PropertyAccessMode.Field);

        b.HasMany(x => x.Outcomes)
            .WithOne()
            .HasForeignKey("CourseId")
            .OnDelete(DeleteBehavior.Cascade);
        b.Navigation(x => x.Outcomes).UsePropertyAccessMode(PropertyAccessMode.Field);

        // --- Catalog query indexes -----------------------------------------
        b.HasIndex(x => x.PrimaryCategoryId);
        b.HasIndex(x => new { x.PublishState, x.IsListed });
        b.HasIndex(x => x.DeletedAt);

        // Soft delete: archived stays queryable, deleted is filtered out.
        b.HasQueryFilter(x => x.DeletedAt == null);
    }
}

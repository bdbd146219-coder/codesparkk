using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> b)
    {
        b.ToTable("Categories");
        b.HasKey(x => x.Id);

        b.Property(x => x.Slug).IsRequired().HasMaxLength(80);
        b.HasIndex(x => x.Slug).IsUnique();

        b.OwnsOne(x => x.Name, n => n.ConfigureLocalizedText("Name", 120));
        b.OwnsOne(x => x.Description, d => d.ConfigureLocalizedText("Description", 500));
        b.Navigation(x => x.Name).IsRequired();
        b.Navigation(x => x.Description).IsRequired();

        b.Property(x => x.Icon).HasMaxLength(80);
        b.Property(x => x.Order).IsRequired();
        b.Property(x => x.IsActive).IsRequired();
        b.Property(x => x.RowVersion).IsRowVersion();
        b.Property(x => x.CreatedAt).IsRequired();
        b.Property(x => x.UpdatedAt).IsRequired();

        b.HasIndex(x => new { x.IsActive, x.Order });
    }
}

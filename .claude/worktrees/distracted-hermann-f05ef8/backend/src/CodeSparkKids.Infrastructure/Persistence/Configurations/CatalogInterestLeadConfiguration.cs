using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class CatalogInterestLeadConfiguration : IEntityTypeConfiguration<CatalogInterestLead>
{
    public void Configure(EntityTypeBuilder<CatalogInterestLead> b)
    {
        b.ToTable("CatalogInterestLeads");
        b.HasKey(x => x.Id);

        b.Property(x => x.SourceType).IsRequired().HasConversion<int>();
        b.Property(x => x.SourceSlug).IsRequired().HasMaxLength(80);
        b.Property(x => x.SourceTitleSnapshot).HasMaxLength(160);

        b.Property(x => x.ParentName).IsRequired().HasMaxLength(120);
        b.Property(x => x.Phone).IsRequired().HasMaxLength(30);
        b.Property(x => x.Email).HasMaxLength(254);
        b.Property(x => x.ChildAge);
        b.Property(x => x.PreferredLanguage).HasMaxLength(2);
        b.Property(x => x.Notes).HasMaxLength(1000);
        b.Property(x => x.AdminNotes).HasMaxLength(1000);

        b.Property(x => x.Status).IsRequired().HasConversion<int>();

        b.Property(x => x.CreatedAt).IsRequired();
        b.Property(x => x.UpdatedAt).IsRequired();
        b.Property(x => x.ContactedAt);
        b.Property(x => x.ArchivedAt);

        // Admin list is ordered by recency and filtered by status.
        b.HasIndex(x => x.CreatedAt);
        b.HasIndex(x => x.Status);
    }
}

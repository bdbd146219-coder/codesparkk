using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class ParentProfileConfiguration : IEntityTypeConfiguration<ParentProfile>
{
    public void Configure(EntityTypeBuilder<ParentProfile> b)
    {
        b.ToTable("ParentProfiles");
        b.HasKey(x => x.Id);

        b.Property(x => x.UserId).IsRequired();
        b.HasIndex(x => x.UserId).IsUnique();

        b.Property(x => x.DisplayName).IsRequired().HasMaxLength(80);
        b.Property(x => x.PreferredLocale).IsRequired().HasMaxLength(5);
        b.Property(x => x.TimeZone).IsRequired().HasMaxLength(40);
        b.Property(x => x.ConsentVersion).IsRequired().HasMaxLength(20);
        b.Property(x => x.ConsentedAt).IsRequired();
        b.Property(x => x.CreatedAt).IsRequired();
        b.Property(x => x.UpdatedAt).IsRequired();
    }
}

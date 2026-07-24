using CodeSparkKids.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

public sealed class AuditEntryConfiguration : IEntityTypeConfiguration<AuditEntry>
{
    public void Configure(EntityTypeBuilder<AuditEntry> b)
    {
        b.ToTable("AuditEntries");
        b.HasKey(x => x.Id);

        b.Property(x => x.OccurredAt).IsRequired();
        b.HasIndex(x => x.OccurredAt);

        b.Property(x => x.EventType).IsRequired().HasMaxLength(40);
        b.HasIndex(x => x.EventType);

        b.Property(x => x.Result).IsRequired().HasMaxLength(10);

        b.Property(x => x.ActorUserId);
        b.Property(x => x.ActorEmail).HasMaxLength(254);
        b.Property(x => x.TargetUserId);

        b.Property(x => x.ClientIp).HasMaxLength(45);
        b.Property(x => x.UserAgent).HasMaxLength(255);
        b.Property(x => x.ContextJson).HasMaxLength(1000);
    }
}

using CodeSparkKids.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CodeSparkKids.Infrastructure.Persistence.Configurations;

/// <summary>
/// Shared EF mapping helpers for the catalog. <see cref="LocalizedText"/> is
/// mapped as an owned type with two relational columns ("<prefix>_En" and
/// "<prefix>_Ar"). We deliberately use owned columns rather than a JSON column
/// so the data is queryable/indexable on both SQL Server (production) and
/// SQLite (tests) with identical semantics and no provider-specific JSON
/// support required.
/// </summary>
internal static class CatalogMappingExtensions
{
    public static void ConfigureLocalizedText<TOwner>(
        this OwnedNavigationBuilder<TOwner, LocalizedText> b,
        string columnPrefix,
        int maxLength)
        where TOwner : class
    {
        b.Property(x => x.En).HasColumnName($"{columnPrefix}_En").HasMaxLength(maxLength).IsRequired();
        b.Property(x => x.Ar).HasColumnName($"{columnPrefix}_Ar").HasMaxLength(maxLength).IsRequired();
    }
}

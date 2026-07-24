using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace CodeSparkKids.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<ParentProfile> ParentProfiles => Set<ParentProfile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

    // --- Catalog (C1B) -----------------------------------------------------
    // Only the aggregate roots get DbSets; modules, instructors, outcomes, and
    // path items are reached through their root and have no standalone set.
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<LearningPath> LearningPaths => Set<LearningPath>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // RowVersion: SQL Server uses a native `rowversion` (store-generated).
        // Other providers (SQLite, used by the test suite) have no equivalent,
        // so demote it to a plain app-managed concurrency token there — it stays
        // a byte[] column but is never expected to be store-generated, which
        // keeps EnsureCreated + SaveChanges working without a value generator.
        if (!Database.IsSqlServer())
        {
            foreach (var rowVersion in modelBuilder.Model.GetEntityTypes()
                         .Select(e => e.FindProperty("RowVersion"))
                         .Where(p => p is not null))
            {
                rowVersion!.ValueGenerated = ValueGenerated.Never;
                rowVersion.SetColumnType(null);
                rowVersion.SetDefaultValueSql(null);
                // Without a native rowversion there is nothing for EF to compare;
                // leaving it as a concurrency token makes aggregate-child writes
                // throw spurious DbUpdateConcurrencyException. Concurrency on these
                // providers (SQLite tests) is enforced by the service's explicit
                // base64 comparison instead.
                rowVersion.IsConcurrencyToken = false;
            }
        }
    }
}

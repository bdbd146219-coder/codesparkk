using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CodeSparkKids.Infrastructure.Persistence;

/// <summary>
/// Design-time factory used by `dotnet ef` when the runtime DI container is
/// not available (e.g. generating migrations). The application itself
/// registers <see cref="AppDbContext"/> via DI only when a connection string
/// is present — so this factory provides a placeholder SQL Server connection
/// string that targets the production-style provider for migration shape.
/// Never used at runtime.
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<AppDbContext>();
        builder.UseSqlServer(
            "Server=(localdb)\\MSSQLLocalDB;Database=CodeSparkKids_Design;Trusted_Connection=True;TrustServerCertificate=True;",
            sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name));
        return new AppDbContext(builder.Options);
    }
}

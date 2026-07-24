using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>
/// A <see cref="AuthTestFactory"/> that runs against a real, uniquely-named
/// SQL Server LocalDB database instead of in-memory SQLite. This is the only way
/// to exercise the native <c>rowversion</c> concurrency token that production
/// uses — SQLite demotes it to a no-op (see <see cref="AppDbContext"/>), which is
/// precisely why the C4J catalog-update concurrency bug never surfaced on the
/// SQLite suite.
///
/// The schema is created with <c>EnsureCreated</c> (no migrations are applied),
/// mirroring the base factory, and the throwaway database is dropped on dispose.
/// </summary>
public sealed class SqlServerCatalogTestFactory : AuthTestFactory
{
    /// <summary>The connection string for this instance's throwaway LocalDB database.</summary>
    public string ConnectionString { get; } =
        SqlServerTestDb.BuildConnectionString(SqlServerTestDb.NewDatabaseName());

    protected override void RegisterAppDbContext(IServiceCollection services) =>
        services.AddDbContext<AppDbContext>(options => options.UseSqlServer(ConnectionString));

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;
        SqlServerTestDb.Drop(ConnectionString);
    }
}

using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>
/// Helpers for the SQL Server / LocalDB catalog concurrency tests (C4J). These
/// tests reproduce a production save bug that never surfaces on the SQLite test
/// provider, where the RowVersion concurrency token is deliberately demoted.
///
/// LocalDB is a Windows-only, developer-machine facility. When it is not
/// reachable (Linux CI, minimal agents) the associated tests are skipped via
/// <see cref="SqlServerFactAttribute"/> rather than failed, so the wider suite
/// stays green everywhere.
/// </summary>
public static class SqlServerTestDb
{
    private const string Instance = @"Server=(localdb)\MSSQLLocalDB;";

    /// <summary>Connection string against the LocalDB <c>master</c> database, used only to probe availability.</summary>
    private const string MasterConnectionString =
        Instance + "Database=master;Trusted_Connection=True;TrustServerCertificate=True;Connect Timeout=5;";

    private static readonly Lazy<bool> Available = new(Probe);

    /// <summary>True when a LocalDB instance is reachable on this machine.</summary>
    public static bool IsAvailable => Available.Value;

    /// <summary>Builds a connection string for a uniquely-named test database.</summary>
    public static string BuildConnectionString(string databaseName) =>
        Instance + $"Database={databaseName};Trusted_Connection=True;TrustServerCertificate=True;";

    /// <summary>A collision-resistant, valid SQL Server database name for a single test instance.</summary>
    public static string NewDatabaseName() => "csk_c4j_" + Guid.NewGuid().ToString("N");

    /// <summary>
    /// Drops the named database best-effort. Clears the pool first so LocalDB does
    /// not refuse the drop because of lingering pooled connections.
    /// </summary>
    public static void Drop(string connectionString)
    {
        try
        {
            SqlConnection.ClearAllPools();
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(connectionString)
                .Options;
            using var db = new AppDbContext(options);
            db.Database.EnsureDeleted();
        }
        catch
        {
            // Best-effort teardown — a leftover LocalDB test database is harmless.
        }
    }

    private static bool Probe()
    {
        try
        {
            using var connection = new SqlConnection(MasterConnectionString);
            connection.Open();
            return true;
        }
        catch
        {
            return false;
        }
    }
}

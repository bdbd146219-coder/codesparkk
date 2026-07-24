namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>
/// A <see cref="FactAttribute"/> that skips itself when LocalDB / SQL Server is
/// not reachable. Lets the SQL Server-specific catalog concurrency tests (C4J)
/// run on developer machines and Windows CI while staying green on providers
/// where LocalDB is absent.
/// </summary>
public sealed class SqlServerFactAttribute : FactAttribute
{
    public SqlServerFactAttribute()
    {
        if (!SqlServerTestDb.IsAvailable)
            Skip = "LocalDB / SQL Server is not available on this machine.";
    }
}

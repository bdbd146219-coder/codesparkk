using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>
/// Per-test WebApplicationFactory backed by an in-memory SQLite database and
/// a tracking email sender. Each instance owns its own SQLite connection so
/// tests are isolated from each other.
///
/// The database provider is registered through <see cref="RegisterAppDbContext"/>
/// so subclasses (e.g. the C4J SQL Server / LocalDB factory) can swap SQLite for
/// a real provider without duplicating the rest of the host wiring.
/// </summary>
public class AuthTestFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;
    public TrackingEmailSender Emails { get; } = new();

    /// <summary>
    /// Isolated temp storage root for this instance, so tests that write catalog
    /// media (the admin upload endpoint) do not touch the repo or each other.
    /// Unused by tests that never touch storage.
    /// </summary>
    public string MediaRoot { get; }

    public AuthTestFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        MediaRoot = Path.Combine(Path.GetTempPath(), "csk-auth-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(MediaRoot);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        // IMPORTANT: We deliberately do NOT override the Auth section here.
        // AddJwtBearer in AddInfrastructure binds the signing key + issuer +
        // audience at registration time, while AuthService reads IOptions
        // lazily. If we override the Auth values, AuthService sees the test
        // values but JwtBearer keeps the appsettings values, so tokens it
        // issues fail validation. Letting both read from appsettings.json
        // (with appsettings.Development.json setting RequireHttps=false)
        // keeps issuer/validator in sync.
        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Force a connection string so AddInfrastructure() registers a DbContext
                // (we'll immediately replace it with SQLite below).
                ["ConnectionStrings:DefaultConnection"] = "Server=test;Database=test;",
                // Disable Development catalog seeding for the auth test host — these
                // tests own their own schema via EnsureCreated and must not run the
                // migrate-then-seed startup path.
                ["Catalog:SeedOnStartup"] = "false",
                // Point catalog media storage at this instance's temp root.
                ["FileStorage:LocalDisk:RootPath"] = MediaRoot,
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Replace the production SQL-Server DbContext with the test provider.
            var dbDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbDescriptor is not null) services.Remove(dbDescriptor);

            RegisterAppDbContext(services);

            // Swap the email sender for the tracking version.
            var emailDescriptors = services.Where(d => d.ServiceType == typeof(IEmailSender)).ToList();
            foreach (var d in emailDescriptors) services.Remove(d);
            services.AddSingleton<IEmailSender>(Emails);

            // Create the schema for this test instance.
            using var scope = services.BuildServiceProvider().CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        });
    }

    /// <summary>
    /// Registers the <see cref="AppDbContext"/> for the test host. The default
    /// uses the instance's shared in-memory SQLite connection; subclasses can
    /// override to point at a real provider (see the SQL Server / LocalDB
    /// factory used by the C4J concurrency tests).
    /// </summary>
    protected virtual void RegisterAppDbContext(IServiceCollection services) =>
        services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;

        _connection.Dispose();
        try
        {
            Directory.Delete(MediaRoot, recursive: true);
        }
        catch
        {
            // Best-effort cleanup of the temp storage root.
        }
    }
}

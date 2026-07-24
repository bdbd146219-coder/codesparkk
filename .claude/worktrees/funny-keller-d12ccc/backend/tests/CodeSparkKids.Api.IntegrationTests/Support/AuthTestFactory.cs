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
/// </summary>
public sealed class AuthTestFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;
    public TrackingEmailSender Emails { get; } = new();

    public AuthTestFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
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
            });
        });

        builder.ConfigureTestServices(services =>
        {
            // Replace the SQL-Server DbContext with SQLite using a shared connection.
            var dbDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbDescriptor is not null) services.Remove(dbDescriptor);

            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

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

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _connection.Dispose();
    }
}

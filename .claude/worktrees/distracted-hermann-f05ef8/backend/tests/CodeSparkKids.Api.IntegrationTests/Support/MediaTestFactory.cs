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
/// WebApplicationFactory for the public media endpoint. Points the file-storage
/// root at a private temp directory so tests control exactly which files exist,
/// and cleans it up on dispose. Uses in-memory SQLite only so the host builds
/// (the media endpoint itself never touches the database).
/// </summary>
public sealed class MediaTestFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection;

    /// <summary>Absolute path to the temp storage root the endpoint serves from.</summary>
    public string MediaRoot { get; }

    public MediaTestFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        MediaRoot = Path.Combine(
            Path.GetTempPath(),
            "csk-media-tests",
            Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(MediaRoot);
    }

    /// <summary>Write a fixture file under the media root at a relative key.</summary>
    public void WriteFile(string relativeKey, byte[] content)
    {
        var path = Path.Combine(MediaRoot, relativeKey.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllBytes(path, content);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=test;Database=test;",
                ["Catalog:SeedOnStartup"] = "false",
                ["FileStorage:LocalDisk:RootPath"] = MediaRoot,
            });
        });

        builder.ConfigureTestServices(services =>
        {
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (dbDescriptor is not null) services.Remove(dbDescriptor);

            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));

            using var scope = services.BuildServiceProvider().CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        });
    }

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
            // Best-effort cleanup of the temp directory.
        }
    }
}

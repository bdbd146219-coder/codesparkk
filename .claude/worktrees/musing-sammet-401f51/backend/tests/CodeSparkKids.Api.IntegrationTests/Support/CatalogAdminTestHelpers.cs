using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>
/// DB-scope helpers for the admin course write tests (reading seeded ids and
/// asserting audit side-effects).
/// </summary>
internal static class CatalogAdminTestHelpers
{
    public static async Task<Guid> GetCategoryIdAsync(this AuthTestFactory factory, string slug)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Categories.Where(c => c.Slug == slug).Select(c => c.Id).SingleAsync();
    }

    public static async Task<Guid> GetCourseIdAsync(this AuthTestFactory factory, string slug)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Courses.IgnoreQueryFilters().Where(c => c.Slug == slug).Select(c => c.Id).SingleAsync();
    }

    public static async Task<int> CountAuditEntriesAsync(this AuthTestFactory factory, string eventType)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.AuditEntries.CountAsync(a => a.EventType == eventType);
    }
}

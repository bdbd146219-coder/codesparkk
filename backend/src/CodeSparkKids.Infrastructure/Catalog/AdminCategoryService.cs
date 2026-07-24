using System.Text.Json;
using CodeSparkKids.Application.Common.Auth;
using CodeSparkKids.Application.Common.Catalog;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Domain.ValueObjects;
using CodeSparkKids.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Infrastructure.Catalog;

/// <summary>
/// EF Core read+write model for staff category management. Surfaces active and
/// inactive categories with raw bilingual fields; writes enforce explicit
/// rowVersion concurrency, slug uniqueness, and audit logging. No deletion —
/// categories are retired via deactivate/reactivate.
/// </summary>
public sealed class AdminCategoryService(
    AppDbContext db,
    IClock clock,
    IAuditWriter audit,
    ICurrentUser currentUser,
    IValidator<CreateCategoryRequest> createValidator,
    IValidator<UpdateCategoryRequest> updateValidator) : IAdminCategoryService
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    public async Task<PagedResult<AdminCategoryListItemDto>> ListAsync(AdminCategoryListQuery query, CancellationToken ct)
    {
        var (page, pageSize) = ResolvePaging(query.Page, query.PageSize);

        var q = db.Categories.AsQueryable();
        if (query.IsActive is { } active) q = q.Where(c => c.IsActive == active);
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            q = q.Where(c => c.Slug.Contains(term) || c.Name.En.Contains(term) || c.Name.Ar.Contains(term));
        }

        var total = await q.CountAsync(ct);

        var ordered = (query.Sort?.Trim().ToLowerInvariant()) switch
        {
            "name" => q.OrderBy(c => c.Name.En).ThenBy(c => c.Name.Ar),
            "newest" => q.OrderByDescending(c => c.CreatedAt),
            "updated" => q.OrderByDescending(c => c.UpdatedAt),
            _ => q.OrderBy(c => c.Order).ThenBy(c => c.Name.En), // "order" (default)
        };

        var pageItems = await ordered.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var counts = await PublishedCountsAsync(pageItems.Select(c => c.Id), ct);

        var items = pageItems.Select(c => new AdminCategoryListItemDto(
            c.Id, c.Slug, c.Name.En, c.Name.Ar, c.Icon, c.Order, c.IsActive,
            counts.GetValueOrDefault(c.Id), c.CreatedAt, c.UpdatedAt, Encode(c.RowVersion))).ToList();

        return new PagedResult<AdminCategoryListItemDto>(items, page, pageSize, total, TotalPages(total, pageSize));
    }

    public async Task<AdminCategoryDetailDto> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw NotFound();
        var count = (await PublishedCountsAsync(new[] { id }, ct)).GetValueOrDefault(id);
        return MapDetail(category, count);
    }

    public async Task<CreateCategoryResponse> CreateAsync(CreateCategoryRequest request, RequestContext ctx, CancellationToken ct)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var now = clock.UtcNow;
        var slug = NormalizeSlug(string.IsNullOrWhiteSpace(request.Slug) ? request.NameEn : request.Slug!);
        if (await db.Categories.AnyAsync(c => c.Slug == slug, ct))
            throw SlugConflict();

        var category = Category.Create(
            slug,
            LocalizedText.Create(request.NameEn, request.NameAr),
            LocalizedText.Create(request.DescriptionEn, request.DescriptionAr),
            request.Icon,
            request.Order ?? 0,
            now);

        db.Categories.Add(category);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw SlugConflict();
        }

        await WriteAuditAsync(CourseAuditEventTypes.CategoryCreated, category, ctx, ct);
        return new CreateCategoryResponse(category.Id, category.Slug, category.IsActive, Encode(category.RowVersion));
    }

    public async Task<AdminCategoryDetailDto> UpdateAsync(Guid id, UpdateCategoryRequest request, RequestContext ctx, CancellationToken ct)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var category = await LoadMatchingAsync(id, request.RowVersion, ct);
        var now = clock.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            var newSlug = NormalizeSlug(request.Slug!);
            if (newSlug != category.Slug)
            {
                if (await db.Categories.AnyAsync(c => c.Slug == newSlug && c.Id != category.Id, ct))
                    throw SlugConflict();
                category.ChangeSlug(newSlug, now);
            }
        }

        category.Update(
            LocalizedText.Create(request.NameEn, request.NameAr),
            LocalizedText.Create(request.DescriptionEn, request.DescriptionAr),
            request.Icon,
            request.Order,
            now);

        await SaveAsync(category, ct);
        await WriteAuditAsync(CourseAuditEventTypes.CategoryUpdated, category, ctx, ct);
        return MapDetail(category, await PublishedCountAsync(category.Id, ct));
    }

    public Task<AdminCategoryDetailDto> ActivateAsync(Guid id, CategoryLifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        TransitionAsync(id, request.RowVersion, CourseAuditEventTypes.CategoryActivated, (c, now) => c.Activate(now), ctx, ct);

    public Task<AdminCategoryDetailDto> DeactivateAsync(Guid id, CategoryLifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        TransitionAsync(id, request.RowVersion, CourseAuditEventTypes.CategoryDeactivated, (c, now) => c.Deactivate(now), ctx, ct);

    // --- Helpers -----------------------------------------------------------

    private async Task<AdminCategoryDetailDto> TransitionAsync(
        Guid id, string rowVersion, string eventType, Action<Category, DateTime> transition, RequestContext ctx, CancellationToken ct)
    {
        var category = await LoadMatchingAsync(id, rowVersion, ct);
        transition(category, clock.UtcNow);
        await SaveAsync(category, ct);
        await WriteAuditAsync(eventType, category, ctx, ct);
        return MapDetail(category, await PublishedCountAsync(category.Id, ct));
    }

    private async Task<Category> LoadMatchingAsync(Guid id, string rowVersion, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct) ?? throw NotFound();
        var incoming = Decode(rowVersion);
        if (!incoming.AsSpan().SequenceEqual(category.RowVersion))
            throw Conflict(category);
        return category;
    }

    private async Task SaveAsync(Category category, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw Conflict(category);
        }
        catch (DbUpdateException)
        {
            throw SlugConflict();
        }
    }

    private async Task<Dictionary<Guid, int>> PublishedCountsAsync(IEnumerable<Guid> categoryIds, CancellationToken ct)
    {
        var ids = categoryIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<Guid, int>();

        var counts = await db.Courses
            .Where(c => ids.Contains(c.PrimaryCategoryId) && c.PublishState == CoursePublishState.Published && c.IsListed)
            .GroupBy(c => c.PrimaryCategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        return counts.ToDictionary(x => x.CategoryId, x => x.Count);
    }

    private async Task<int> PublishedCountAsync(Guid categoryId, CancellationToken ct) =>
        (await PublishedCountsAsync(new[] { categoryId }, ct)).GetValueOrDefault(categoryId);

    private Task WriteAuditAsync(string eventType, Category category, RequestContext ctx, CancellationToken ct)
    {
        Guid? actorId = Guid.TryParse(currentUser.UserId, out var g) ? g : null;
        return audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, eventType, AuditResults.Success,
            actorUserId: actorId, actorEmail: currentUser.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
            contextJson: JsonSerializer.Serialize(new { categoryId = category.Id, categorySlug = category.Slug, isActive = category.IsActive })), ct);
    }

    private static AdminCategoryDetailDto MapDetail(Category c, int publishedCount) =>
        new(c.Id, c.Slug, c.Name.En, c.Name.Ar, c.Description.En, c.Description.Ar,
            c.Icon, c.Order, c.IsActive, publishedCount, c.CreatedAt, c.UpdatedAt, Encode(c.RowVersion));

    private static string Encode(byte[] rowVersion) => Convert.ToBase64String(rowVersion);

    private static byte[] Decode(string? rowVersion)
    {
        if (rowVersion is null)
            throw new CatalogException(400, ProblemTypes.InvalidCategoryUpdate, "catalog.errors.invalidRowVersion");
        try
        {
            return Convert.FromBase64String(rowVersion);
        }
        catch (FormatException)
        {
            throw new CatalogException(400, ProblemTypes.InvalidCategoryUpdate, "catalog.errors.invalidRowVersion");
        }
    }

    private static string NormalizeSlug(string source)
    {
        try
        {
            return Slug.Normalize(source);
        }
        catch (ArgumentException)
        {
            throw new CatalogException(400, ProblemTypes.InvalidCategoryUpdate, "catalog.errors.invalidSlug");
        }
    }

    private static (int Page, int PageSize) ResolvePaging(int? page, int? pageSize)
    {
        var p = page ?? 1;
        var ps = pageSize ?? DefaultPageSize;
        if (p < 1 || ps < 1)
            throw new CatalogException(400, ProblemTypes.InvalidPagination, "catalog.errors.invalidPagination");
        if (ps > MaxPageSize) ps = MaxPageSize;
        return (p, ps);
    }

    private static CatalogException NotFound() =>
        new(404, ProblemTypes.CategoryNotFound, "catalog.errors.categoryNotFound");

    private static CatalogException SlugConflict() =>
        new(409, ProblemTypes.CategorySlugAlreadyExists, "catalog.errors.categorySlugAlreadyExists");

    private static CatalogException Conflict(Category category) =>
        new(409, ProblemTypes.CategoryConcurrencyConflict, "catalog.errors.concurrencyConflict",
            new Dictionary<string, object?> { ["currentRowVersion"] = Encode(category.RowVersion) });

    private static int TotalPages(int total, int pageSize) =>
        total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
}

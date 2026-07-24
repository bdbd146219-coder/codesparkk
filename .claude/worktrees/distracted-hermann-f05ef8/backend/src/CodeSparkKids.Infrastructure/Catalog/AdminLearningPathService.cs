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
/// EF Core read+write model for staff learning-path management. Surfaces every
/// non-deleted state with raw bilingual fields and a read-only item list (item
/// mutation is a later slice). Writes enforce explicit rowVersion concurrency,
/// slug uniqueness, archived-edit protection, a service-level publish checklist,
/// and audit logging.
/// </summary>
public sealed class AdminLearningPathService(
    AppDbContext db,
    IClock clock,
    IAuditWriter audit,
    ICurrentUser currentUser,
    IValidator<CreateLearningPathRequest> createValidator,
    IValidator<UpdateLearningPathRequest> updateValidator,
    IValidator<AddLearningPathItemRequest> addItemValidator,
    IValidator<ReorderLearningPathItemsRequest> reorderItemsValidator) : IAdminLearningPathService
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    public async Task<PagedResult<AdminLearningPathListItemDto>> ListAsync(AdminLearningPathListQuery query, CancellationToken ct)
    {
        var status = ParseFilterEnum<CoursePublishState>(query.Status);
        var ageBand = ParseFilterEnum<AgeBand>(query.AgeBand);
        var (page, pageSize) = ResolvePaging(query.Page, query.PageSize);

        var q = db.LearningPaths.AsQueryable();
        if (status is { } st) q = q.Where(p => p.PublishState == st);
        if (ageBand is { } ab) q = q.Where(p => p.AgeBand == ab);
        if (query.IsListed is { } listed) q = q.Where(p => p.IsListed == listed);
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            q = q.Where(p => p.Slug.Contains(term) || p.Title.En.Contains(term) || p.Title.Ar.Contains(term));
        }

        var total = await q.CountAsync(ct);

        var ordered = (query.Sort?.Trim().ToLowerInvariant()) switch
        {
            "newest" => q.OrderByDescending(p => p.CreatedAt),
            "title" => q.OrderBy(p => p.Title.En).ThenBy(p => p.Title.Ar),
            "status" => q.OrderBy(p => p.PublishState).ThenByDescending(p => p.UpdatedAt),
            _ => q.OrderByDescending(p => p.UpdatedAt),
        };

        var pageItems = await ordered.Skip((page - 1) * pageSize).Take(pageSize).Include(p => p.Items).ToListAsync(ct);

        var items = pageItems.Select(p => new AdminLearningPathListItemDto(
            p.Id, p.Slug, p.Title.En, p.Title.Ar, p.AgeBand.ToString(),
            p.PublishState.ToString(), p.IsListed, p.Items.Count,
            p.CreatedAt, p.UpdatedAt, p.PublishedAt, p.ArchivedAt, Encode(p.RowVersion))).ToList();

        return new PagedResult<AdminLearningPathListItemDto>(items, page, pageSize, total, TotalPages(total, pageSize));
    }

    public async Task<AdminLearningPathDetailDto> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var path = await LoadAsync(id, ct) ?? throw NotFound();
        return await MapDetailAsync(path, ct);
    }

    public async Task<CreateLearningPathResponse> CreateAsync(CreateLearningPathRequest request, RequestContext ctx, CancellationToken ct)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var now = clock.UtcNow;
        var ageBand = ParseRequired<AgeBand>(request.AgeBand);
        var slug = NormalizeSlug(string.IsNullOrWhiteSpace(request.Slug) ? request.TitleEn : request.Slug!);
        if (await db.LearningPaths.AnyAsync(p => p.Slug == slug, ct))
            throw SlugConflict();

        var path = LearningPath.Create(slug, LocalizedText.Create(request.TitleEn, request.TitleAr), ageBand, now);
        path.UpdateDetails(
            LocalizedText.Create(request.TitleEn, request.TitleAr),
            LocalizedText.Create(request.SummaryEn, request.SummaryAr),
            ageBand, now);
        if (request.Media is not null)
            path.UpdateMedia(ToMedia(request.Media), now);

        db.LearningPaths.Add(path);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw SlugConflict();
        }

        await WriteAuditAsync(CourseAuditEventTypes.LearningPathCreated, path, null, ctx, ct);
        return new CreateLearningPathResponse(path.Id, path.Slug, path.PublishState.ToString(), Encode(path.RowVersion));
    }

    public async Task<AdminLearningPathDetailDto> UpdateAsync(Guid id, UpdateLearningPathRequest request, RequestContext ctx, CancellationToken ct)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var path = await LoadAsync(id, ct) ?? throw NotFound();
        if (path.PublishState == CoursePublishState.Archived)
            throw InvalidState("catalog.errors.archivedReadOnly");
        EnsureRowVersionMatches(request.RowVersion, path);

        var now = clock.UtcNow;
        var ageBand = ParseRequired<AgeBand>(request.AgeBand);

        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            var newSlug = NormalizeSlug(request.Slug!);
            if (newSlug != path.Slug)
            {
                if (path.PublishState != CoursePublishState.Draft)
                    throw InvalidState("catalog.errors.slugEditDraftOnly");
                if (await db.LearningPaths.AnyAsync(p => p.Slug == newSlug && p.Id != path.Id, ct))
                    throw SlugConflict();
                path.ChangeSlug(newSlug, now);
            }
        }

        try
        {
            path.UpdateDetails(
                LocalizedText.Create(request.TitleEn, request.TitleAr),
                LocalizedText.Create(request.SummaryEn, request.SummaryAr),
                ageBand, now);
            if (request.Media is not null)
                path.UpdateMedia(ToMedia(request.Media), now);
            if (request.IsListed != path.IsListed)
                path.SetListing(request.IsListed, now);
        }
        catch (InvalidOperationException)
        {
            throw InvalidState("catalog.errors.invalidState");
        }

        await SaveAsync(path, ct);
        await WriteAuditAsync(CourseAuditEventTypes.LearningPathUpdated, path, null, ctx, ct);
        return await MapDetailAsync(path, ct);
    }

    // --- Lifecycle ---------------------------------------------------------

    public async Task<LearningPathLifecycleResponseDto> PublishAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct)
    {
        var path = await LoadEditableAsync(id, request.RowVersion, ct);

        var unmet = (await BuildUnmetAsync(path, ct)).ToList();
        if (unmet.Count > 0)
            throw new CatalogException(422, ProblemTypes.LearningPathPublishChecklistFailed,
                "catalog.errors.learningPathPublishChecklistFailed",
                new Dictionary<string, object?> { ["readiness"] = LearningPathReadinessMapper.Map(unmet) });

        var fromState = path.PublishState.ToString();
        path.Publish(clock.UtcNow);
        await SaveAsync(path, ct);
        await WriteAuditAsync(CourseAuditEventTypes.LearningPathPublished, path, fromState, ctx, ct);
        return Lifecycle(path);
    }

    public Task<LearningPathLifecycleResponseDto> UnpublishAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        TransitionAsync(id, request.RowVersion, CourseAuditEventTypes.LearningPathUnpublished, (p, now) => p.ReturnToDraft(now), ctx, ct);

    public Task<LearningPathLifecycleResponseDto> ArchiveAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        TransitionAsync(id, request.RowVersion, CourseAuditEventTypes.LearningPathArchived, (p, now) => p.Archive(now), ctx, ct);

    public Task<LearningPathLifecycleResponseDto> RestoreAsync(Guid id, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        TransitionAsync(id, request.RowVersion, CourseAuditEventTypes.LearningPathRestored, (p, now) => p.Restore(now), ctx, ct);

    private async Task<LearningPathLifecycleResponseDto> TransitionAsync(
        Guid id, string rowVersion, string eventType, Action<LearningPath, DateTime> transition, RequestContext ctx, CancellationToken ct)
    {
        var path = await LoadEditableAsync(id, rowVersion, ct);
        var fromState = path.PublishState.ToString();
        try
        {
            transition(path, clock.UtcNow);
        }
        catch (InvalidOperationException)
        {
            throw InvalidState("catalog.errors.invalidState");
        }
        await SaveAsync(path, ct);
        await WriteAuditAsync(eventType, path, fromState, ctx, ct);
        return Lifecycle(path);
    }

    // --- Items -------------------------------------------------------------

    public async Task<AdminLearningPathDetailDto> AddItemAsync(Guid id, AddLearningPathItemRequest request, RequestContext ctx, CancellationToken ct)
    {
        await addItemValidator.ValidateAndThrowAsync(request, ct);
        var path = await LoadForItemEditAsync(id, request.RowVersion, ct);

        if (!await db.Courses.AnyAsync(c => c.Id == request.CourseId, ct))
            throw new CatalogException(404, ProblemTypes.CourseNotFound, "catalog.errors.courseNotFound");
        if (path.Items.Any(i => i.CourseId == request.CourseId))
            throw new CatalogException(409, ProblemTypes.LearningPathItemDuplicate, "catalog.errors.learningPathItemDuplicate");

        var item = path.AddItem(request.CourseId, request.Note, clock.UtcNow);
        db.Add(item); // new aggregate child → Added (C1C.4 pattern)

        await SaveAsync(path, ct);
        await WriteItemAuditAsync(CourseAuditEventTypes.LearningPathItemAdded, path, item.Id, request.CourseId, ctx, ct);
        return await MapDetailAsync(path, ct);
    }

    public async Task<AdminLearningPathDetailDto> RemoveItemAsync(Guid id, Guid itemId, LearningPathLifecycleRequest request, RequestContext ctx, CancellationToken ct)
    {
        var path = await LoadForItemEditAsync(id, request.RowVersion, ct);
        var item = path.Items.FirstOrDefault(i => i.Id == itemId)
            ?? throw new CatalogException(404, ProblemTypes.LearningPathItemNotFound, "catalog.errors.learningPathItemNotFound");
        var courseId = item.CourseId;

        path.RemoveItem(itemId, clock.UtcNow);

        await SaveAsync(path, ct);
        await WriteItemAuditAsync(CourseAuditEventTypes.LearningPathItemRemoved, path, itemId, courseId, ctx, ct);
        return await MapDetailAsync(path, ct);
    }

    public async Task<AdminLearningPathDetailDto> ReorderItemsAsync(Guid id, ReorderLearningPathItemsRequest request, RequestContext ctx, CancellationToken ct)
    {
        await reorderItemsValidator.ValidateAndThrowAsync(request, ct);
        var path = await LoadForItemEditAsync(id, request.RowVersion, ct);
        ValidateReorderSet(path, request.OrderedItemIds);

        path.ReorderItems(request.OrderedItemIds, clock.UtcNow);

        await SaveAsync(path, ct);
        await WriteItemAuditAsync(CourseAuditEventTypes.LearningPathItemReordered, path, null, null, ctx, ct);
        return await MapDetailAsync(path, ct);
    }

    private async Task<LearningPath> LoadForItemEditAsync(Guid id, string rowVersion, CancellationToken ct)
    {
        var path = await LoadAsync(id, ct) ?? throw NotFound();
        if (path.PublishState == CoursePublishState.Archived)
            throw InvalidState("catalog.errors.archivedReadOnly");
        EnsureRowVersionMatches(rowVersion, path);
        return path;
    }

    private static void ValidateReorderSet(LearningPath path, IReadOnlyList<Guid> orderedItemIds)
    {
        var current = path.Items.Select(i => i.Id).ToHashSet();
        var ok = orderedItemIds.Count == current.Count &&
                 orderedItemIds.Distinct().Count() == orderedItemIds.Count &&
                 orderedItemIds.All(current.Contains);
        if (!ok)
            throw new CatalogException(400, ProblemTypes.InvalidLearningPathUpdate, "catalog.errors.invalidItemReorder");
    }

    private Task WriteItemAuditAsync(string eventType, LearningPath path, Guid? itemId, Guid? courseId, RequestContext ctx, CancellationToken ct)
    {
        Guid? actorId = Guid.TryParse(currentUser.UserId, out var g) ? g : null;
        return audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, eventType, AuditResults.Success,
            actorUserId: actorId, actorEmail: currentUser.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
            contextJson: JsonSerializer.Serialize(new
            {
                learningPathId = path.Id,
                learningPathSlug = path.Slug,
                itemId,
                courseId,
            })), ct);
    }

    // --- Readiness ---------------------------------------------------------

    private async Task<IReadOnlyList<LearningPathRequirement>> BuildUnmetAsync(LearningPath path, CancellationToken ct)
    {
        var unmet = path.CheckPublishReadiness().Unmet.ToList();
        if (path.Items.Count > 0)
        {
            var courseIds = path.Items.Select(i => i.CourseId).ToList();
            var anyPublished = await db.Courses
                .AnyAsync(c => courseIds.Contains(c.Id) && c.PublishState == CoursePublishState.Published, ct);
            if (!anyPublished)
                unmet.Add(LearningPathRequirement.NoPublishedCourse);
        }
        return unmet;
    }

    // --- Helpers -----------------------------------------------------------

    private Task<LearningPath?> LoadAsync(Guid id, CancellationToken ct) =>
        db.LearningPaths.Where(p => p.Id == id).Include(p => p.Items).FirstOrDefaultAsync(ct);

    private async Task<LearningPath> LoadEditableAsync(Guid id, string rowVersion, CancellationToken ct)
    {
        var path = await LoadAsync(id, ct) ?? throw NotFound();
        EnsureRowVersionMatches(rowVersion, path);
        return path;
    }

    private async Task SaveAsync(LearningPath path, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw Conflict(path);
        }
        catch (DbUpdateException)
        {
            throw SlugConflict();
        }
    }

    private async Task<AdminLearningPathDetailDto> MapDetailAsync(LearningPath path, CancellationToken ct)
    {
        var orderedItems = path.Items.OrderBy(i => i.Order).ToList();
        var courseIds = orderedItems.Select(i => i.CourseId).Distinct().ToList();
        var courses = courseIds.Count == 0
            ? new Dictionary<Guid, (string Slug, string TitleEn, string State)>()
            : (await db.Courses.Where(c => courseIds.Contains(c.Id))
                    .Select(c => new { c.Id, c.Slug, TitleEn = c.Title.En, c.PublishState })
                    .ToListAsync(ct))
                .ToDictionary(c => c.Id, c => (Slug: c.Slug, TitleEn: c.TitleEn, State: c.PublishState.ToString()));

        var itemDtos = orderedItems.Select(i =>
        {
            courses.TryGetValue(i.CourseId, out var c);
            return new AdminLearningPathItemDto(i.Id, i.CourseId, i.Order, i.Note, c.Slug, c.TitleEn, c.State);
        }).ToList();

        var readiness = LearningPathReadinessMapper.Map(await BuildUnmetAsync(path, ct));

        return new AdminLearningPathDetailDto(
            path.Id, path.Slug, path.Title.En, path.Title.Ar, path.Summary.En, path.Summary.Ar,
            path.AgeBand.ToString(), path.PublishState.ToString(), path.IsListed,
            new AdminLearningPathMediaDto(path.Media.ThumbnailKey, path.Media.ThumbnailAlt, path.Media.HeroKey, path.Media.PromoVideoUrl),
            itemDtos, readiness,
            path.CreatedAt, path.UpdatedAt, path.PublishedAt, path.ArchivedAt, path.DeletedAt, Encode(path.RowVersion));
    }

    private static LearningPathLifecycleResponseDto Lifecycle(LearningPath p) =>
        new(p.Id, p.PublishState.ToString(), p.IsListed, p.PublishedAt, p.ArchivedAt, Encode(p.RowVersion));

    private static CourseMedia ToMedia(AdminLearningPathMediaDto m) =>
        CourseMedia.Create(m.ThumbnailKey, m.ThumbnailAlt, m.HeroKey, m.PromoVideoUrl);

    private void EnsureRowVersionMatches(string rowVersion, LearningPath path)
    {
        if (!Decode(rowVersion).AsSpan().SequenceEqual(path.RowVersion))
            throw Conflict(path);
    }

    private Task WriteAuditAsync(string eventType, LearningPath path, string? fromState, RequestContext ctx, CancellationToken ct)
    {
        Guid? actorId = Guid.TryParse(currentUser.UserId, out var g) ? g : null;
        return audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, eventType, AuditResults.Success,
            actorUserId: actorId, actorEmail: currentUser.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
            contextJson: JsonSerializer.Serialize(new
            {
                learningPathId = path.Id,
                learningPathSlug = path.Slug,
                fromState,
                toState = path.PublishState.ToString(),
                isListed = path.IsListed,
            })), ct);
    }

    private static string Encode(byte[] rowVersion) => Convert.ToBase64String(rowVersion);

    private static byte[] Decode(string? rowVersion)
    {
        if (rowVersion is null)
            throw new CatalogException(400, ProblemTypes.InvalidLearningPathUpdate, "catalog.errors.invalidRowVersion");
        try
        {
            return Convert.FromBase64String(rowVersion);
        }
        catch (FormatException)
        {
            throw new CatalogException(400, ProblemTypes.InvalidLearningPathUpdate, "catalog.errors.invalidRowVersion");
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
            throw new CatalogException(400, ProblemTypes.InvalidLearningPathUpdate, "catalog.errors.invalidSlug");
        }
    }

    private static TEnum ParseRequired<TEnum>(string value) where TEnum : struct, Enum
    {
        if (Enum.TryParse<TEnum>(value?.Trim(), ignoreCase: true, out var parsed) && Enum.IsDefined(parsed))
            return parsed;
        throw new CatalogException(400, ProblemTypes.InvalidLearningPathUpdate, "catalog.errors.invalidLearningPathUpdate");
    }

    private static TEnum? ParseFilterEnum<TEnum>(string? raw) where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (Enum.TryParse<TEnum>(raw.Trim(), ignoreCase: true, out var value) && Enum.IsDefined(value))
            return value;
        throw new CatalogException(400, ProblemTypes.InvalidCatalogFilter, "catalog.errors.invalidFilter");
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
        new(404, ProblemTypes.LearningPathNotFound, "catalog.errors.learningPathNotFound");

    private static CatalogException SlugConflict() =>
        new(409, ProblemTypes.LearningPathSlugAlreadyExists, "catalog.errors.learningPathSlugAlreadyExists");

    private static CatalogException InvalidState(string titleKey) =>
        new(400, ProblemTypes.LearningPathInvalidState, titleKey);

    private static CatalogException Conflict(LearningPath path) =>
        new(409, ProblemTypes.LearningPathConcurrencyConflict, "catalog.errors.concurrencyConflict",
            new Dictionary<string, object?> { ["currentRowVersion"] = Encode(path.RowVersion) });

    private static int TotalPages(int total, int pageSize) =>
        total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
}

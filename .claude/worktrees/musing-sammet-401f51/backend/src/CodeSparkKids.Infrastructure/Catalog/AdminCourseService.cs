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
using CodeSparkKids.Infrastructure.Identity;
using CodeSparkKids.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Infrastructure.Catalog;

/// <summary>
/// EF Core read+write model for staff course management. Reads surface every
/// non-deleted state with raw bilingual fields; writes (C1C.2) create and
/// update drafts with explicit rowVersion concurrency, slug uniqueness,
/// category validation, archived-edit protection, and audit logging.
/// </summary>
public sealed class AdminCourseService(
    AppDbContext db,
    IClock clock,
    IAuditWriter audit,
    ICurrentUser currentUser,
    UserManager<ApplicationUser> users,
    IValidator<CreateCourseRequest> createValidator,
    IValidator<UpdateCourseRequest> updateValidator,
    IValidator<AddModuleRequest> addModuleValidator,
    IValidator<UpdateModuleRequest> updateModuleValidator,
    IValidator<ReorderModulesRequest> reorderValidator,
    IValidator<AssignInstructorRequest> assignInstructorValidator) : IAdminCourseService
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    // --- Reads -------------------------------------------------------------

    public async Task<PagedResult<AdminCourseListItemDto>> ListAsync(AdminCourseListQuery query, CancellationToken ct)
    {
        var status = ParseFilterEnum<CoursePublishState>(query.Status);
        var delivery = ParseFilterEnum<CourseDeliveryType>(query.DeliveryType);
        var difficulty = ParseFilterEnum<CourseDifficulty>(query.Difficulty);
        var ageBand = ParseFilterEnum<AgeBand>(query.AgeBand);
        var (page, pageSize) = ResolvePaging(query.Page, query.PageSize);

        Guid? categoryId = null;
        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            if (Guid.TryParse(query.Category, out var asId))
            {
                categoryId = asId;
            }
            else
            {
                var slug = query.Category.Trim().ToLowerInvariant();
                categoryId = await db.Categories
                    .Where(c => c.Slug == slug)
                    .Select(c => (Guid?)c.Id)
                    .FirstOrDefaultAsync(ct);
                if (categoryId is null)
                    return Empty(page, pageSize);
            }
        }

        var q = db.Courses.AsQueryable();
        if (status is { } st) q = q.Where(c => c.PublishState == st);
        if (delivery is { } d) q = q.Where(c => c.DeliveryType == d);
        if (difficulty is { } df) q = q.Where(c => c.Difficulty == df);
        if (ageBand is { } ab) q = q.Where(c => c.AgeBand == ab);
        if (query.IsListed is { } listed) q = q.Where(c => c.IsListed == listed);
        if (categoryId is { } cid) q = q.Where(c => c.PrimaryCategoryId == cid);
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            q = q.Where(c =>
                c.Slug.Contains(term) ||
                c.Title.En.Contains(term) || c.Title.Ar.Contains(term) ||
                c.Summary.En.Contains(term) || c.Summary.Ar.Contains(term));
        }

        var total = await q.CountAsync(ct);

        var ordered = (query.Sort?.Trim().ToLowerInvariant()) switch
        {
            "newest" => q.OrderByDescending(c => c.CreatedAt),
            "title" => q.OrderBy(c => c.Title.En).ThenBy(c => c.Title.Ar),
            "status" => q.OrderBy(c => c.PublishState).ThenByDescending(c => c.UpdatedAt),
            _ => q.OrderByDescending(c => c.UpdatedAt),
        };

        var pageItems = await ordered.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var categories = await LoadCategoryRefsAsync(pageItems.Select(c => c.PrimaryCategoryId), ct);

        var items = pageItems.Select(c =>
        {
            categories.TryGetValue(c.PrimaryCategoryId, out var category);
            return new AdminCourseListItemDto(
                c.Id, c.Slug, c.Title.En, c.Title.Ar,
                c.PublishState.ToString(), c.IsListed,
                c.DeliveryType.ToString(), c.Difficulty.ToString(), c.AgeBand.ToString(),
                c.MinAge, c.MaxAge, category,
                c.CreatedAt, c.UpdatedAt, c.PublishedAt, c.ArchivedAt,
                EncodeRowVersion(c.RowVersion));
        }).ToList();

        return new PagedResult<AdminCourseListItemDto>(items, page, pageSize, total, TotalPages(total, pageSize));
    }

    public async Task<AdminCourseDetailDto> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var course = await LoadCourseGraphAsync(id, ct)
            ?? throw NotFound();
        var category = (await LoadCategoryRefsAsync(new[] { course.PrimaryCategoryId }, ct))
            .GetValueOrDefault(course.PrimaryCategoryId);
        return MapDetail(course, category);
    }

    // --- Writes ------------------------------------------------------------

    public async Task<CreateCourseResponse> CreateAsync(CreateCourseRequest request, RequestContext ctx, CancellationToken ct)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        var now = clock.UtcNow;
        var delivery = ParseRequired<CourseDeliveryType>(request.DeliveryType);
        var difficulty = ParseRequired<CourseDifficulty>(request.Difficulty);
        var ageBand = ParseRequired<AgeBand>(request.AgeBand);

        var slug = NormalizeSlug(string.IsNullOrWhiteSpace(request.Slug) ? request.TitleEn : request.Slug!);
        if (await db.Courses.AnyAsync(c => c.Slug == slug, ct))
            throw SlugConflict();

        await EnsureCategoryActiveAsync(request.PrimaryCategoryId, ct);

        Course course;
        try
        {
            course = Course.Create(
                slug,
                LocalizedText.Create(request.TitleEn, request.TitleAr),
                request.PrimaryCategoryId,
                delivery, difficulty, ageBand, request.MinAge, request.MaxAge, now);
        }
        catch (ArgumentException)
        {
            throw InvalidUpdate();
        }

        db.Courses.Add(course);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw SlugConflict(); // unique index backstop (e.g. soft-deleted holder)
        }

        await WriteAuditAsync(CourseAuditEventTypes.CourseCreated, course, ctx, ct);

        return new CreateCourseResponse(course.Id, course.Slug, course.PublishState.ToString(), EncodeRowVersion(course.RowVersion));
    }

    public async Task<AdminCourseDetailDto> UpdateAsync(Guid id, UpdateCourseRequest request, RequestContext ctx, CancellationToken ct)
    {
        await updateValidator.ValidateAndThrowAsync(request, ct);

        var course = await LoadCourseGraphAsync(id, ct)
            ?? throw NotFound();

        // Archived courses are read-only — must be restored first (C1C.3).
        if (course.PublishState == CoursePublishState.Archived)
            throw new CatalogException(400, ProblemTypes.CourseInvalidState, "catalog.errors.archivedReadOnly");

        EnsureRowVersionMatches(request.RowVersion, course);

        var now = clock.UtcNow;
        var delivery = ParseRequired<CourseDeliveryType>(request.DeliveryType);
        var difficulty = ParseRequired<CourseDifficulty>(request.Difficulty);
        var ageBand = ParseRequired<AgeBand>(request.AgeBand);

        // Slug change (validated + unique excluding self).
        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            var newSlug = NormalizeSlug(request.Slug!);
            if (newSlug != course.Slug)
            {
                if (await db.Courses.AnyAsync(c => c.Slug == newSlug && c.Id != course.Id, ct))
                    throw SlugConflict();
                course.ChangeSlug(newSlug, now);
            }
        }

        // Category change (must exist + be active).
        if (request.PrimaryCategoryId != course.PrimaryCategoryId)
        {
            await EnsureCategoryActiveAsync(request.PrimaryCategoryId, ct);
            course.ChangePrimaryCategory(request.PrimaryCategoryId, now);
        }

        try
        {
            course.UpdateDetails(
                LocalizedText.Create(request.TitleEn, request.TitleAr),
                LocalizedText.Create(request.SubtitleEn, request.SubtitleAr),
                LocalizedText.Create(request.SummaryEn, request.SummaryAr),
                LocalizedText.Create(request.DescriptionEn, request.DescriptionAr),
                now);
            course.UpdateAgeRange(ageBand, request.MinAge, request.MaxAge, now);
            course.UpdateDelivery(delivery, difficulty, now);
            if (request.Media is not null)
                course.UpdateMedia(
                    CourseMedia.Create(request.Media.ThumbnailKey, request.Media.ThumbnailAlt, request.Media.HeroKey, request.Media.PromoVideoUrl),
                    now);
            if (request.Pricing is not null)
                course.UpdatePricing(MapPricing(request.Pricing), now);
            if (request.Outcomes is not null)
                course.UpdateOutcomes(request.Outcomes.Select(o => LocalizedText.Create(o.TextEn, o.TextAr)), now);
            ApplyListing(course, request.IsListed, now);
        }
        catch (ArgumentException)
        {
            throw InvalidUpdate();
        }

        // EF concurrency defense (effective on SQL Server's native rowversion).
        db.Entry(course).Property(c => c.RowVersion).OriginalValue = DecodeRowVersion(request.RowVersion);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw ConcurrencyConflict(course);
        }
        catch (DbUpdateException)
        {
            throw SlugConflict();
        }

        await WriteAuditAsync(CourseAuditEventTypes.CourseUpdated, course, ctx, ct);

        var category = (await LoadCategoryRefsAsync(new[] { course.PrimaryCategoryId }, ct))
            .GetValueOrDefault(course.PrimaryCategoryId);
        return MapDetail(course, category);
    }

    // --- Lifecycle ---------------------------------------------------------

    public Task<LifecycleResponseDto> PublishAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        RunLifecycleAsync(id, request.RowVersion, ctx, CourseAuditEventTypes.CoursePublished, (course, now) =>
        {
            var readiness = course.CheckPublishReadiness();
            if (!readiness.IsReady)
                throw new CatalogException(422, ProblemTypes.CoursePublishChecklistFailed,
                    "catalog.errors.publishChecklistFailed",
                    new Dictionary<string, object?> { ["readiness"] = PublishReadinessMapper.Map(readiness) });
            course.Publish(now);
        }, ct);

    public Task<LifecycleResponseDto> UnpublishAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        RunLifecycleAsync(id, request.RowVersion, ctx, CourseAuditEventTypes.CourseUnpublished,
            (course, now) => course.ReturnToDraft(now), ct);

    public Task<LifecycleResponseDto> ArchiveAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        RunLifecycleAsync(id, request.RowVersion, ctx, CourseAuditEventTypes.CourseArchived,
            (course, now) => course.Archive(now), ct);

    public Task<LifecycleResponseDto> RestoreAsync(Guid id, LifecycleRequest request, RequestContext ctx, CancellationToken ct) =>
        RunLifecycleAsync(id, request.RowVersion, ctx, CourseAuditEventTypes.CourseRestored,
            (course, now) => course.Restore(now), ct);

    private async Task<LifecycleResponseDto> RunLifecycleAsync(
        Guid id, string rowVersion, RequestContext ctx, string eventType, Action<Course, DateTime> transition, CancellationToken ct)
    {
        var course = await LoadCourseGraphAsync(id, ct)
            ?? throw NotFound();

        EnsureRowVersionMatches(rowVersion, course);

        var fromState = course.PublishState.ToString();
        var now = clock.UtcNow;
        try
        {
            transition(course, now);
        }
        catch (InvalidOperationException)
        {
            throw new CatalogException(400, ProblemTypes.CourseInvalidState, "catalog.errors.invalidState");
        }

        db.Entry(course).Property(c => c.RowVersion).OriginalValue = DecodeRowVersion(rowVersion);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw ConcurrencyConflict(course);
        }

        await WriteLifecycleAuditAsync(eventType, course, fromState, ctx, ct);

        return new LifecycleResponseDto(
            course.Id,
            course.PublishState.ToString(),
            course.IsListed,
            course.PublishedAt,
            course.ArchivedAt,
            EncodeRowVersion(course.RowVersion));
    }

    private async Task WriteLifecycleAuditAsync(string eventType, Course course, string fromState, RequestContext ctx, CancellationToken ct)
    {
        Guid? actorId = Guid.TryParse(currentUser.UserId, out var g) ? g : null;
        await audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, eventType, AuditResults.Success,
            actorUserId: actorId,
            actorEmail: currentUser.Email,
            clientIp: ctx.ClientIp,
            userAgent: ctx.UserAgent,
            contextJson: JsonSerializer.Serialize(new
            {
                courseId = course.Id,
                slug = course.Slug,
                fromState,
                toState = course.PublishState.ToString(),
            })), ct);
    }

    // --- Modules -----------------------------------------------------------

    public async Task<AdminCourseDetailDto> AddModuleAsync(Guid id, AddModuleRequest request, RequestContext ctx, CancellationToken ct)
    {
        await addModuleValidator.ValidateAndThrowAsync(request, ct);
        var course = await LoadEditableCourseAsync(id, request.RowVersion, ct);

        var module = course.AddModule(
            LocalizedText.Create(request.TitleEn, request.TitleAr),
            LocalizedText.Create(request.SummaryEn, request.SummaryAr),
            clock.UtcNow);
        db.Add(module); // mark the new child (and its owned values) as Added

        var detail = await SaveAndReturnAsync(course, request.RowVersion, ct);
        await WriteModuleAuditAsync(CourseAuditEventTypes.CourseModuleAdded, course, module.Id, ctx, ct);
        return detail;
    }

    public async Task<AdminCourseDetailDto> UpdateModuleAsync(Guid id, Guid moduleId, UpdateModuleRequest request, RequestContext ctx, CancellationToken ct)
    {
        await updateModuleValidator.ValidateAndThrowAsync(request, ct);
        var course = await LoadEditableCourseAsync(id, request.RowVersion, ct);
        EnsureModuleExists(course, moduleId);

        course.UpdateModule(moduleId,
            LocalizedText.Create(request.TitleEn, request.TitleAr),
            LocalizedText.Create(request.SummaryEn, request.SummaryAr),
            clock.UtcNow);

        var detail = await SaveAndReturnAsync(course, request.RowVersion, ct);
        await WriteModuleAuditAsync(CourseAuditEventTypes.CourseModuleUpdated, course, moduleId, ctx, ct);
        return detail;
    }

    public async Task<AdminCourseDetailDto> RemoveModuleAsync(Guid id, Guid moduleId, LifecycleRequest request, RequestContext ctx, CancellationToken ct)
    {
        var course = await LoadEditableCourseAsync(id, request.RowVersion, ct);
        EnsureModuleExists(course, moduleId);

        course.RemoveModule(moduleId, clock.UtcNow);

        var detail = await SaveAndReturnAsync(course, request.RowVersion, ct);
        await WriteModuleAuditAsync(CourseAuditEventTypes.CourseModuleRemoved, course, moduleId, ctx, ct);
        return detail;
    }

    public async Task<AdminCourseDetailDto> ReorderModulesAsync(Guid id, ReorderModulesRequest request, RequestContext ctx, CancellationToken ct)
    {
        await reorderValidator.ValidateAndThrowAsync(request, ct);
        var course = await LoadEditableCourseAsync(id, request.RowVersion, ct);
        ValidateReorderSet(course, request.OrderedModuleIds);

        course.ReorderModules(request.OrderedModuleIds, clock.UtcNow);

        var detail = await SaveAndReturnAsync(course, request.RowVersion, ct);
        await WriteModuleAuditAsync(CourseAuditEventTypes.CourseModuleReordered, course, null, ctx, ct);
        return detail;
    }

    // --- Instructors -------------------------------------------------------

    public async Task<AdminCourseDetailDto> AssignInstructorAsync(Guid id, AssignInstructorRequest request, RequestContext ctx, CancellationToken ct)
    {
        await assignInstructorValidator.ValidateAndThrowAsync(request, ct);
        var course = await LoadEditableCourseAsync(id, request.RowVersion, ct);
        var role = ParseRequired<CourseInstructorRole>(request.RoleOnCourse);
        await EnsureAssignableInstructorAsync(request.InstructorUserId);

        var isNew = course.Instructors.All(i => i.InstructorUserId != request.InstructorUserId);
        var instructor = course.AssignInstructor(request.InstructorUserId, role, clock.UtcNow);
        if (isNew) db.Add(instructor); // new assignment → Added; re-assignment stays Modified

        var detail = await SaveAndReturnAsync(course, request.RowVersion, ct);
        await WriteInstructorAuditAsync(CourseAuditEventTypes.CourseInstructorAssigned, course, request.InstructorUserId, role, ctx, ct);
        return detail;
    }

    public async Task<AdminCourseDetailDto> RemoveInstructorAsync(Guid id, Guid instructorUserId, LifecycleRequest request, RequestContext ctx, CancellationToken ct)
    {
        var course = await LoadEditableCourseAsync(id, request.RowVersion, ct);
        if (course.Instructors.All(i => i.InstructorUserId != instructorUserId))
            throw new CatalogException(404, ProblemTypes.InstructorNotFound, "catalog.errors.instructorNotFound");

        course.RemoveInstructor(instructorUserId, clock.UtcNow);

        var detail = await SaveAndReturnAsync(course, request.RowVersion, ct);
        await WriteInstructorAuditAsync(CourseAuditEventTypes.CourseInstructorUnassigned, course, instructorUserId, null, ctx, ct);
        return detail;
    }

    // --- Structural helpers ------------------------------------------------

    private async Task<Course> LoadEditableCourseAsync(Guid id, string rowVersion, CancellationToken ct)
    {
        var course = await LoadCourseGraphAsync(id, ct) ?? throw NotFound();
        if (course.PublishState == CoursePublishState.Archived)
            throw new CatalogException(400, ProblemTypes.CourseInvalidState, "catalog.errors.archivedReadOnly");
        EnsureRowVersionMatches(rowVersion, course);
        return course;
    }

    private async Task<AdminCourseDetailDto> SaveAndReturnAsync(Course course, string rowVersion, CancellationToken ct)
    {
        // Concurrency is enforced by the explicit base64 compare in
        // LoadEditableCourseAsync; EF's loaded original value still drives native
        // rowversion checks on SQL Server. We do NOT override OriginalValue here
        // because, combined with an aggregate-child INSERT/DELETE, it confuses the
        // concurrency-token UPDATE on providers without a real rowversion (SQLite).
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw ConcurrencyConflict(course);
        }

        var category = (await LoadCategoryRefsAsync(new[] { course.PrimaryCategoryId }, ct))
            .GetValueOrDefault(course.PrimaryCategoryId);
        return MapDetail(course, category);
    }

    private static void EnsureModuleExists(Course course, Guid moduleId)
    {
        if (course.Modules.All(m => m.Id != moduleId))
            throw new CatalogException(404, ProblemTypes.ModuleNotFound, "catalog.errors.moduleNotFound");
    }

    private static void ValidateReorderSet(Course course, IReadOnlyList<Guid> orderedModuleIds)
    {
        var current = course.Modules.Select(m => m.Id).ToHashSet();
        var ok = orderedModuleIds.Count == current.Count &&
                 orderedModuleIds.Distinct().Count() == orderedModuleIds.Count &&
                 orderedModuleIds.All(current.Contains);
        if (!ok)
            throw new CatalogException(400, ProblemTypes.InvalidCourseUpdate, "catalog.errors.invalidModuleReorder");
    }

    private async Task EnsureAssignableInstructorAsync(Guid instructorUserId)
    {
        var user = await users.FindByIdAsync(instructorUserId.ToString());
        if (user is null || !user.IsActive || user.DeletedAt is not null)
            throw new CatalogException(404, ProblemTypes.InstructorNotFound, "catalog.errors.instructorNotFound");

        var roles = await users.GetRolesAsync(user);
        var allowed = roles.Any(r => r is AppRoles.Instructor or AppRoles.Admin or AppRoles.SuperAdmin);
        if (!allowed)
            throw new CatalogException(400, ProblemTypes.InvalidInstructorAssignment, "catalog.errors.invalidInstructorAssignment");
    }

    private Task WriteModuleAuditAsync(string eventType, Course course, Guid? moduleId, RequestContext ctx, CancellationToken ct)
    {
        Guid? actorId = Guid.TryParse(currentUser.UserId, out var g) ? g : null;
        return audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, eventType, AuditResults.Success,
            actorUserId: actorId, actorEmail: currentUser.Email,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
            contextJson: JsonSerializer.Serialize(new { courseId = course.Id, slug = course.Slug, moduleId })), ct);
    }

    private Task WriteInstructorAuditAsync(string eventType, Course course, Guid instructorUserId, CourseInstructorRole? role, RequestContext ctx, CancellationToken ct)
    {
        Guid? actorId = Guid.TryParse(currentUser.UserId, out var g) ? g : null;
        return audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, eventType, AuditResults.Success,
            actorUserId: actorId, actorEmail: currentUser.Email,
            targetUserId: instructorUserId,
            clientIp: ctx.ClientIp, userAgent: ctx.UserAgent,
            contextJson: JsonSerializer.Serialize(new
            {
                courseId = course.Id,
                slug = course.Slug,
                instructorUserId,
                roleOnCourse = role?.ToString(),
            })), ct);
    }

    // --- Mutation helpers --------------------------------------------------

    private static void ApplyListing(Course course, bool isListed, DateTime now)
    {
        if (isListed != course.IsListed)
            course.SetListing(isListed, now); // throws if listing a non-published course → mapped to 400
    }

    private static CoursePricing MapPricing(UpdateCoursePricingDto pricing)
    {
        var model = ParseRequired<PricingModel>(pricing.Model);
        return model switch
        {
            PricingModel.Free => CoursePricing.Free(),
            PricingModel.OneTime => CoursePricing.OneTime(pricing.Amount ?? 0m, pricing.Currency ?? string.Empty),
            PricingModel.Subscription => CoursePricing.Subscription(pricing.Amount ?? 0m, pricing.Currency ?? string.Empty),
            _ => CoursePricing.Free(),
        };
    }

    private async Task EnsureCategoryActiveAsync(Guid categoryId, CancellationToken ct)
    {
        var active = await db.Categories.AnyAsync(c => c.Id == categoryId && c.IsActive, ct);
        if (!active)
            throw new CatalogException(404, ProblemTypes.CategoryNotFound, "catalog.errors.categoryNotFound");
    }

    private void EnsureRowVersionMatches(string rowVersion, Course course)
    {
        var incoming = DecodeRowVersion(rowVersion);
        if (!incoming.AsSpan().SequenceEqual(course.RowVersion))
            throw ConcurrencyConflict(course);
    }

    private async Task WriteAuditAsync(string eventType, Course course, RequestContext ctx, CancellationToken ct)
    {
        Guid? actorId = Guid.TryParse(currentUser.UserId, out var g) ? g : null;
        await audit.WriteAsync(AuditEntry.Create(
            clock.UtcNow, eventType, AuditResults.Success,
            actorUserId: actorId,
            actorEmail: currentUser.Email,
            clientIp: ctx.ClientIp,
            userAgent: ctx.UserAgent,
            contextJson: JsonSerializer.Serialize(new
            {
                courseId = course.Id,
                slug = course.Slug,
                state = course.PublishState.ToString(),
            })), ct);
    }

    // --- Query + mapping helpers -------------------------------------------

    private Task<Course?> LoadCourseGraphAsync(Guid id, CancellationToken ct) =>
        db.Courses
            .Where(c => c.Id == id)
            .Include(c => c.Modules)
            .Include(c => c.Instructors)
            .Include(c => c.Outcomes)
            .FirstOrDefaultAsync(ct);

    private async Task<Dictionary<Guid, AdminCategoryRefDto>> LoadCategoryRefsAsync(
        IEnumerable<Guid> categoryIds, CancellationToken ct)
    {
        var ids = categoryIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<Guid, AdminCategoryRefDto>();

        var categories = await db.Categories.Where(c => ids.Contains(c.Id)).ToListAsync(ct);
        return categories.ToDictionary(
            c => c.Id,
            c => new AdminCategoryRefDto(c.Id, c.Slug, c.Name.En, c.Name.Ar));
    }

    private static AdminCourseDetailDto MapDetail(Course course, AdminCategoryRefDto? category)
    {
        var readinessDto = PublishReadinessMapper.Map(course.CheckPublishReadiness());

        return new AdminCourseDetailDto(
            course.Id,
            course.Slug,
            course.Title.En, course.Title.Ar,
            course.Subtitle.En, course.Subtitle.Ar,
            course.Summary.En, course.Summary.Ar,
            course.Description.En, course.Description.Ar,
            course.DeliveryType.ToString(),
            course.Difficulty.ToString(),
            course.AgeBand.ToString(),
            course.MinAge,
            course.MaxAge,
            course.PublishState.ToString(),
            course.IsListed,
            course.PrimaryCategoryId,
            category,
            new AdminPricingDto(course.Pricing.Model.ToString(), course.Pricing.Amount, course.Pricing.Currency),
            new AdminMediaDto(course.Media.ThumbnailKey, course.Media.ThumbnailAlt, course.Media.HeroKey, course.Media.PromoVideoUrl),
            course.Outcomes.OrderBy(o => o.Order).Select(o => new AdminOutcomeDto(o.Text.En, o.Text.Ar, o.Order)).ToList(),
            course.Modules.OrderBy(m => m.Order).Select(m => new AdminModuleDto(m.Id, m.Title.En, m.Title.Ar, m.Summary.En, m.Summary.Ar, m.Order)).ToList(),
            course.Instructors.OrderBy(i => i.RoleOnCourse).Select(i => new AdminInstructorDto(i.InstructorUserId, i.RoleOnCourse.ToString())).ToList(),
            readinessDto,
            course.CreatedAt,
            course.UpdatedAt,
            course.PublishedAt,
            course.ArchivedAt,
            course.DeletedAt,
            EncodeRowVersion(course.RowVersion));
    }

    // --- Primitives --------------------------------------------------------

    private static string EncodeRowVersion(byte[] rowVersion) => Convert.ToBase64String(rowVersion);

    private static byte[] DecodeRowVersion(string? rowVersion)
    {
        if (rowVersion is null)
            throw new CatalogException(400, ProblemTypes.InvalidCourseUpdate, "catalog.errors.invalidRowVersion");
        try
        {
            return Convert.FromBase64String(rowVersion);
        }
        catch (FormatException)
        {
            throw new CatalogException(400, ProblemTypes.InvalidCourseUpdate, "catalog.errors.invalidRowVersion");
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
            throw new CatalogException(400, ProblemTypes.InvalidCourseUpdate, "catalog.errors.invalidSlug");
        }
    }

    private static TEnum ParseRequired<TEnum>(string value) where TEnum : struct, Enum
    {
        if (Enum.TryParse<TEnum>(value?.Trim(), ignoreCase: true, out var parsed) && Enum.IsDefined(parsed))
            return parsed;
        throw InvalidUpdate();
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
        new(404, ProblemTypes.CourseNotFound, "catalog.errors.courseNotFound");

    private static CatalogException SlugConflict() =>
        new(409, ProblemTypes.CourseSlugAlreadyExists, "catalog.errors.slugAlreadyExists");

    private static CatalogException InvalidUpdate() =>
        new(400, ProblemTypes.InvalidCourseUpdate, "catalog.errors.invalidCourseUpdate");

    private static CatalogException ConcurrencyConflict(Course course) =>
        new(409, ProblemTypes.CourseConcurrencyConflict, "catalog.errors.concurrencyConflict",
            new Dictionary<string, object?> { ["currentRowVersion"] = EncodeRowVersion(course.RowVersion) });

    private static PagedResult<AdminCourseListItemDto> Empty(int page, int pageSize) =>
        new(Array.Empty<AdminCourseListItemDto>(), page, pageSize, 0, 0);

    private static int TotalPages(int total, int pageSize) =>
        total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
}

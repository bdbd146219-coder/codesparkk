using CodeSparkKids.Application.Common.Auth;
using CodeSparkKids.Application.Common.Catalog;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Infrastructure.Catalog;

/// <summary>
/// EF Core implementation of the read-only public catalog. Every query is
/// scoped to published content and the soft-delete query filter excludes
/// deleted rows, so hidden states never leak. Localization is applied in memory
/// via <see cref="Domain.ValueObjects.LocalizedText.Resolve"/> after the page
/// has been narrowed in the database.
/// </summary>
public sealed class CatalogService(AppDbContext db) : ICatalogService
{
    private const int DefaultPageSize = 12;
    private const int MaxPageSize = 50;

    public async Task<PagedResult<CourseCardDto>> GetCoursesAsync(
        CourseCatalogQuery query, string? acceptLanguage, CancellationToken ct)
    {
        var lang = ResolveLang(query.Lang, acceptLanguage);
        var ageBand = ParseEnum<AgeBand>(query.AgeBand);
        var delivery = ParseEnum<CourseDeliveryType>(query.DeliveryType);
        var difficulty = ParseEnum<CourseDifficulty>(query.Difficulty);
        if (query.Age is < 0)
            throw InvalidFilter();
        var (page, pageSize) = ResolvePaging(query.Page, query.PageSize);

        Guid? categoryId = null;
        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var slug = query.Category.Trim().ToLowerInvariant();
            categoryId = await db.Categories
                .Where(c => c.Slug == slug)
                .Select(c => (Guid?)c.Id)
                .FirstOrDefaultAsync(ct);
            if (categoryId is null)
                return Empty<CourseCardDto>(page, pageSize); // unknown category → no matches
        }

        var q = db.Courses.Where(c => c.PublishState == CoursePublishState.Published && c.IsListed);

        if (ageBand is { } ab) q = q.Where(c => c.AgeBand == ab);
        if (delivery is { } d) q = q.Where(c => c.DeliveryType == d);
        if (difficulty is { } df) q = q.Where(c => c.Difficulty == df);
        if (query.Age is { } age) q = q.Where(c => c.MinAge <= age && age <= c.MaxAge);
        if (categoryId is { } cid) q = q.Where(c => c.PrimaryCategoryId == cid);
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            q = q.Where(c =>
                c.Title.En.Contains(term) || c.Title.Ar.Contains(term) ||
                c.Summary.En.Contains(term) || c.Summary.Ar.Contains(term) ||
                c.Description.En.Contains(term) || c.Description.Ar.Contains(term));
        }

        var total = await q.CountAsync(ct);

        var ordered = (query.Sort?.Trim().ToLowerInvariant()) switch
        {
            "title" => lang == "ar"
                ? q.OrderBy(c => c.Title.Ar).ThenBy(c => c.Title.En)
                : q.OrderBy(c => c.Title.En).ThenBy(c => c.Title.Ar),
            _ => q.OrderByDescending(c => c.PublishedAt).ThenByDescending(c => c.CreatedAt),
        };

        var pageItems = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(c => c.Instructors)
            .Include(c => c.Outcomes)
            .ToListAsync(ct);

        var categories = await LoadCategoryRefsAsync(pageItems.Select(c => c.PrimaryCategoryId), lang, ct);
        var items = pageItems.Select(c => MapCard(c, categories, lang)).ToList();

        return new PagedResult<CourseCardDto>(items, page, pageSize, total, TotalPages(total, pageSize));
    }

    public async Task<CourseDetailDto> GetCourseBySlugAsync(
        string slug, string? lang, string? acceptLanguage, CancellationToken ct)
    {
        var resolved = ResolveLang(lang, acceptLanguage);
        var key = (slug ?? string.Empty).Trim().ToLowerInvariant();

        var course = await db.Courses
            .Where(c => c.Slug == key && c.PublishState == CoursePublishState.Published)
            .Include(c => c.Instructors)
            .Include(c => c.Outcomes)
            .Include(c => c.Modules)
            .FirstOrDefaultAsync(ct);

        if (course is null)
            throw new CatalogException(404, ProblemTypes.CourseNotFound, "catalog.errors.courseNotFound");

        var categories = await LoadCategoryRefsAsync(new[] { course.PrimaryCategoryId }, resolved, ct);
        categories.TryGetValue(course.PrimaryCategoryId, out var category);

        var availableLocales = new List<string>(2);
        if (course.Title.HasEnglish) availableLocales.Add("en");
        if (course.Title.HasArabic) availableLocales.Add("ar");

        return new CourseDetailDto(
            course.Slug,
            course.Title.Resolve(resolved),
            course.Subtitle.Resolve(resolved),
            course.Summary.Resolve(resolved),
            course.Description.Resolve(resolved),
            course.AgeBand.ToString(),
            course.MinAge,
            course.MaxAge,
            course.DeliveryType.ToString(),
            course.Difficulty.ToString(),
            category,
            course.Media.ThumbnailKey,
            course.Media.ThumbnailAlt,
            course.Media.HeroKey,
            course.Media.PromoVideoUrl,
            MapInstructors(course),
            MapPricing(course),
            course.Outcomes.OrderBy(o => o.Order).Select(o => o.Text.Resolve(resolved)).ToList(),
            course.Modules.OrderBy(m => m.Order)
                .Select(m => new CourseModulePreviewDto(m.Title.Resolve(resolved), m.Summary.Resolve(resolved), m.Order))
                .ToList(),
            availableLocales);
    }

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(
        string? lang, string? acceptLanguage, CancellationToken ct)
    {
        var resolved = ResolveLang(lang, acceptLanguage);

        var categories = await db.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Order)
            .ToListAsync(ct);

        var counts = await db.Courses
            .Where(c => c.PublishState == CoursePublishState.Published && c.IsListed)
            .GroupBy(c => c.PrimaryCategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var countByCategory = counts.ToDictionary(x => x.CategoryId, x => x.Count);

        return categories
            .Select(c => new CategoryDto(
                c.Slug,
                c.Name.Resolve(resolved),
                c.Description.Resolve(resolved),
                c.Icon,
                c.Order,
                countByCategory.GetValueOrDefault(c.Id)))
            .ToList();
    }

    public async Task<PagedResult<LearningPathCardDto>> GetLearningPathsAsync(
        LearningPathQuery query, string? acceptLanguage, CancellationToken ct)
    {
        var lang = ResolveLang(query.Lang, acceptLanguage);
        var ageBand = ParseEnum<AgeBand>(query.AgeBand);
        var (page, pageSize) = ResolvePaging(query.Page, query.PageSize);

        var q = db.LearningPaths.Where(p => p.PublishState == CoursePublishState.Published && p.IsListed);
        if (ageBand is { } ab) q = q.Where(p => p.AgeBand == ab);

        var total = await q.CountAsync(ct);

        var pageItems = await q
            .OrderByDescending(p => p.PublishedAt).ThenByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(p => p.Items)
            .ToListAsync(ct);

        var items = pageItems
            .Select(p => new LearningPathCardDto(
                p.Slug,
                p.Title.Resolve(lang),
                p.Summary.Resolve(lang),
                p.AgeBand.ToString(),
                p.Items.Count,
                p.Media.ThumbnailKey,
                p.Media.ThumbnailAlt))
            .ToList();

        return new PagedResult<LearningPathCardDto>(items, page, pageSize, total, TotalPages(total, pageSize));
    }

    public async Task<LearningPathDetailDto> GetLearningPathBySlugAsync(
        string slug, string? lang, string? acceptLanguage, CancellationToken ct)
    {
        var resolved = ResolveLang(lang, acceptLanguage);
        var key = (slug ?? string.Empty).Trim().ToLowerInvariant();

        var path = await db.LearningPaths
            .Where(p => p.Slug == key && p.PublishState == CoursePublishState.Published)
            .Include(p => p.Items)
            .FirstOrDefaultAsync(ct);

        if (path is null)
            throw new CatalogException(404, ProblemTypes.LearningPathNotFound, "catalog.errors.learningPathNotFound");

        var orderedItems = path.Items.OrderBy(i => i.Order).ToList();
        var courseIds = orderedItems.Select(i => i.CourseId).ToList();

        var courses = await db.Courses
            .Where(c => courseIds.Contains(c.Id) && c.PublishState == CoursePublishState.Published)
            .Include(c => c.Instructors)
            .Include(c => c.Outcomes)
            .ToListAsync(ct);
        var courseById = courses.ToDictionary(c => c.Id);

        var categories = await LoadCategoryRefsAsync(courses.Select(c => c.PrimaryCategoryId), resolved, ct);

        var cards = orderedItems
            .Where(i => courseById.ContainsKey(i.CourseId))
            .Select(i => MapCard(courseById[i.CourseId], categories, resolved))
            .ToList();

        return new LearningPathDetailDto(
            path.Slug,
            path.Title.Resolve(resolved),
            path.Summary.Resolve(resolved),
            path.AgeBand.ToString(),
            path.Media.ThumbnailKey,
            path.Media.ThumbnailAlt,
            cards);
    }

    // --- Mapping helpers ---------------------------------------------------

    private async Task<Dictionary<Guid, CategoryRefDto>> LoadCategoryRefsAsync(
        IEnumerable<Guid> categoryIds, string lang, CancellationToken ct)
    {
        var ids = categoryIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<Guid, CategoryRefDto>();

        var categories = await db.Categories.Where(c => ids.Contains(c.Id)).ToListAsync(ct);
        return categories.ToDictionary(c => c.Id, c => new CategoryRefDto(c.Slug, c.Name.Resolve(lang)));
    }

    private static CourseCardDto MapCard(Course course, IReadOnlyDictionary<Guid, CategoryRefDto> categories, string lang)
    {
        categories.TryGetValue(course.PrimaryCategoryId, out var category);
        return new CourseCardDto(
            course.Slug,
            course.Title.Resolve(lang),
            course.Subtitle.Resolve(lang),
            course.Summary.Resolve(lang),
            course.AgeBand.ToString(),
            course.MinAge,
            course.MaxAge,
            course.DeliveryType.ToString(),
            course.Difficulty.ToString(),
            category,
            course.Media.ThumbnailKey,
            course.Media.ThumbnailAlt,
            MapInstructors(course),
            MapPricing(course),
            course.Outcomes.OrderBy(o => o.Order).Take(3).Select(o => o.Text.Resolve(lang)).ToList());
    }

    private static List<CatalogInstructorDto> MapInstructors(Course course) =>
        course.Instructors
            .OrderBy(i => i.RoleOnCourse)
            .Select(i => new CatalogInstructorDto(i.InstructorUserId, i.RoleOnCourse.ToString()))
            .ToList();

    private static CatalogPricingDto MapPricing(Course course) =>
        new(course.Pricing.Model.ToString(), course.Pricing.Amount, course.Pricing.Currency);

    // --- Input parsing -----------------------------------------------------

    private static string ResolveLang(string? lang, string? acceptLanguage)
    {
        var direct = Normalize(lang);
        if (direct is not null) return direct;

        if (!string.IsNullOrWhiteSpace(acceptLanguage))
        {
            var first = acceptLanguage.Split(',')[0].Split(';')[0];
            var fromHeader = Normalize(first);
            if (fromHeader is not null) return fromHeader;
        }

        return "en";

        static string? Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var v = value.Trim();
            if (v.StartsWith("ar", StringComparison.OrdinalIgnoreCase)) return "ar";
            if (v.StartsWith("en", StringComparison.OrdinalIgnoreCase)) return "en";
            return null;
        }
    }

    private static TEnum? ParseEnum<TEnum>(string? raw) where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (Enum.TryParse<TEnum>(raw.Trim(), ignoreCase: true, out var value) && Enum.IsDefined(value))
            return value;
        throw InvalidFilter();
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

    private static CatalogException InvalidFilter() =>
        new(400, ProblemTypes.InvalidCatalogFilter, "catalog.errors.invalidFilter");

    private static PagedResult<T> Empty<T>(int page, int pageSize) =>
        new(Array.Empty<T>(), page, pageSize, 0, 0);

    private static int TotalPages(int total, int pageSize) =>
        total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
}

using CodeSparkKids.Application.Common.Auth;
using CodeSparkKids.Application.Common.Catalog;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Application.Features.Catalog.Validators;
using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Infrastructure.Catalog;

/// <summary>
/// EF Core implementation of pre-commerce catalog interest capture (C4N).
/// Creating a lead only ever writes a <see cref="CatalogInterestLead"/> — it
/// never touches enrollment, subscription, access, or payment (none of which
/// exist). The public create path confirms the source item is currently
/// published (mirroring the public detail visibility) before storing anything.
/// </summary>
public sealed class CatalogInterestService(
    AppDbContext db,
    IClock clock,
    IValidator<CreateCatalogInterestRequest> createValidator) : ICatalogInterestService
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    public async Task<CatalogInterestResponse> CreateAsync(CreateCatalogInterestRequest request, CancellationToken ct)
    {
        await createValidator.ValidateAndThrowAsync(request, ct);

        if (!CreateCatalogInterestRequestValidator.TryParseSourceType(request.SourceType, out var sourceType))
            throw InvalidInterest();

        var slug = request.SourceSlug.Trim().ToLowerInvariant();

        // Confirm the source is currently public (published; soft-deleted rows are
        // excluded by the query filter). We never reveal whether a hidden item
        // exists — an unknown slug and a draft/archived one both 404.
        var titleSnapshot = sourceType == CatalogInterestSourceType.Course
            ? await db.Courses
                .Where(c => c.Slug == slug && c.PublishState == CoursePublishState.Published)
                .Select(c => c.Title.En)
                .FirstOrDefaultAsync(ct)
            : await db.LearningPaths
                .Where(p => p.Slug == slug && p.PublishState == CoursePublishState.Published)
                .Select(p => p.Title.En)
                .FirstOrDefaultAsync(ct);

        if (titleSnapshot is null)
            throw new CatalogException(404, ProblemTypes.CatalogInterestSourceNotFound, "catalog.errors.interestSourceNotFound");

        var lead = CatalogInterestLead.Create(
            sourceType,
            slug,
            titleSnapshot,
            request.ParentName,
            request.Phone,
            request.Email,
            request.ChildAge,
            NormalizeLanguage(request.PreferredLanguage),
            request.Notes,
            clock.UtcNow);

        db.CatalogInterestLeads.Add(lead);
        await db.SaveChangesAsync(ct);

        return new CatalogInterestResponse(lead.Id, StatusToWire(lead.Status), lead.CreatedAt);
    }

    public async Task<PagedResult<AdminCatalogInterestLeadDto>> ListAsync(
        string? status, int? page, int? pageSize, CancellationToken ct)
    {
        var (p, ps) = ResolvePaging(page, pageSize);

        var q = db.CatalogInterestLeads.AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!TryParseStatus(status, out var parsed))
                throw InvalidInterest();
            q = q.Where(l => l.Status == parsed);
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(l => Map(l))
            .ToListAsync(ct);

        return new PagedResult<AdminCatalogInterestLeadDto>(items, p, ps, total, TotalPages(total, ps));
    }

    public async Task<AdminCatalogInterestLeadDto> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var lead = await db.CatalogInterestLeads.FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw NotFound();
        return Map(lead);
    }

    public async Task<AdminCatalogInterestLeadDto> UpdateStatusAsync(
        Guid id, UpdateCatalogInterestStatusRequest request, CancellationToken ct)
    {
        if (!TryParseStatus(request.Status, out var status))
            throw InvalidInterest();
        if (request.AdminNotes is { Length: > 1000 })
            throw InvalidInterest();

        var lead = await db.CatalogInterestLeads.FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw NotFound();

        lead.SetStatus(status, request.AdminNotes, clock.UtcNow);
        await db.SaveChangesAsync(ct);
        return Map(lead);
    }

    // --- Helpers -----------------------------------------------------------

    private static AdminCatalogInterestLeadDto Map(CatalogInterestLead l) =>
        new(l.Id,
            l.SourceType == CatalogInterestSourceType.Course ? "course" : "learningPath",
            l.SourceSlug,
            l.SourceTitleSnapshot,
            l.ParentName,
            l.Phone,
            l.Email,
            l.ChildAge,
            l.PreferredLanguage,
            l.Notes,
            StatusToWire(l.Status),
            l.CreatedAt,
            l.UpdatedAt,
            l.ContactedAt,
            l.ArchivedAt,
            l.AdminNotes);

    private static string StatusToWire(CatalogInterestStatus status) => status switch
    {
        CatalogInterestStatus.New => "new",
        CatalogInterestStatus.Contacted => "contacted",
        CatalogInterestStatus.Archived => "archived",
        _ => "new",
    };

    private static bool TryParseStatus(string? value, out CatalogInterestStatus status)
    {
        status = default;
        if (string.IsNullOrWhiteSpace(value)) return false;
        switch (value.Trim().ToLowerInvariant())
        {
            case "new": status = CatalogInterestStatus.New; return true;
            case "contacted": status = CatalogInterestStatus.Contacted; return true;
            case "archived": status = CatalogInterestStatus.Archived; return true;
            default: return false;
        }
    }

    private static string? NormalizeLanguage(string? lang)
    {
        if (string.IsNullOrWhiteSpace(lang)) return null;
        var v = lang.Trim().ToLowerInvariant();
        return v is "en" or "ar" ? v : null;
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

    private static int TotalPages(int total, int pageSize) =>
        total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);

    private static CatalogException InvalidInterest() =>
        new(400, ProblemTypes.InvalidCatalogInterest, "catalog.errors.invalidInterest");

    private static CatalogException NotFound() =>
        new(404, ProblemTypes.CatalogInterestNotFound, "catalog.errors.interestNotFound");
}

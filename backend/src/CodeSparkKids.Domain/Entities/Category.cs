using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// A top-level catalog category (e.g. "Python", "Robotics"). Root entity, not
/// soft-deletable — categories are retired via <see cref="IsActive"/> so existing
/// course references stay intact.
/// </summary>
public sealed class Category
{
    public Guid Id { get; private set; }
    public string Slug { get; private set; } = string.Empty;
    public LocalizedText Name { get; private set; } = LocalizedText.Empty;
    public LocalizedText Description { get; private set; } = LocalizedText.Empty;
    public string? Icon { get; private set; }
    public int Order { get; private set; }
    public bool IsActive { get; private set; }

    /// <summary>Optimistic-concurrency token (SQL Server <c>rowversion</c>).</summary>
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Category() { }

    public static Category Create(
        string slug,
        LocalizedText name,
        LocalizedText description,
        string? icon,
        int order,
        DateTime nowUtc)
    {
        return new Category
        {
            Id = Guid.NewGuid(),
            Slug = Catalog.Slug.Normalize(slug),
            Name = name ?? LocalizedText.Empty,
            Description = description ?? LocalizedText.Empty,
            Icon = string.IsNullOrWhiteSpace(icon) ? null : icon.Trim(),
            Order = order,
            IsActive = true,
            CreatedAt = nowUtc,
            UpdatedAt = nowUtc,
        };
    }

    public void Update(LocalizedText name, LocalizedText description, string? icon, int order, DateTime nowUtc)
    {
        Name = name ?? LocalizedText.Empty;
        Description = description ?? LocalizedText.Empty;
        Icon = string.IsNullOrWhiteSpace(icon) ? null : icon.Trim();
        Order = order;
        UpdatedAt = nowUtc;
    }

    public void ChangeSlug(string slug, DateTime nowUtc)
    {
        Slug = Catalog.Slug.Normalize(slug);
        UpdatedAt = nowUtc;
    }

    public void Activate(DateTime nowUtc)
    {
        IsActive = true;
        UpdatedAt = nowUtc;
    }

    public void Deactivate(DateTime nowUtc)
    {
        IsActive = false;
        UpdatedAt = nowUtc;
    }
}

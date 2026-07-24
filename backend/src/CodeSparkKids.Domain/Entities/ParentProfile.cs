namespace CodeSparkKids.Domain.Entities;

/// <summary>
/// Business profile for a parent. 1:1 with the Identity ApplicationUser via
/// <see cref="UserId"/>. Created in the same transaction as the user.
/// </summary>
public sealed class ParentProfile
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string DisplayName { get; private set; } = string.Empty;
    public string PreferredLocale { get; private set; } = "en";
    public string TimeZone { get; private set; } = "UTC";
    public DateTime ConsentedAt { get; private set; }
    public string ConsentVersion { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private ParentProfile() { }

    public static ParentProfile Create(
        Guid userId,
        string displayName,
        string preferredLocale,
        string timeZone,
        string consentVersion,
        DateTime nowUtc)
    {
        return new ParentProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            DisplayName = displayName,
            PreferredLocale = preferredLocale,
            TimeZone = timeZone,
            ConsentedAt = nowUtc,
            ConsentVersion = consentVersion,
            CreatedAt = nowUtc,
            UpdatedAt = nowUtc,
        };
    }

    public void UpdateDisplay(string displayName, string preferredLocale, string timeZone, DateTime nowUtc)
    {
        DisplayName = displayName;
        PreferredLocale = preferredLocale;
        TimeZone = timeZone;
        UpdatedAt = nowUtc;
    }
}

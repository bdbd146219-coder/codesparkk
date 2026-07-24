using Microsoft.AspNetCore.Identity;

namespace CodeSparkKids.Infrastructure.Identity;

/// <summary>
/// Identity user. Only identity-level fields here — business profile data
/// lives on <see cref="CodeSparkKids.Domain.Entities.ParentProfile"/> (or the
/// equivalent future Instructor/Admin profile) so this row stays auth-only.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public bool IsActive { get; set; } = true;
}

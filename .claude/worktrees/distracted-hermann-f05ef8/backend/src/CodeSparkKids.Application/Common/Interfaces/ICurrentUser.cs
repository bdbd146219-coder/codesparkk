namespace CodeSparkKids.Application.Common.Interfaces;

public interface ICurrentUser
{
    string? UserId { get; }
    string? Role { get; }

    /// <summary>The authenticated user's email (from the token), for audit actor data.</summary>
    string? Email { get; }

    bool IsAuthenticated { get; }
}

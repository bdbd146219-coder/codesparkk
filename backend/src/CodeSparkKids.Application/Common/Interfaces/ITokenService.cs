namespace CodeSparkKids.Application.Common.Interfaces;

public sealed record AccessTokenIssued(string Token, DateTime ExpiresAt);
public sealed record RefreshTokenIssued(string RawToken, string Hash);

public interface ITokenService
{
    AccessTokenIssued IssueAccessToken(Guid userId, string email, bool emailVerified, IReadOnlyList<string> roles);
    RefreshTokenIssued CreateRefreshToken();
    string HashRefreshToken(string rawToken);
}

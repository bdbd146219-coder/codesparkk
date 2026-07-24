using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CodeSparkKids.Application.Common.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CodeSparkKids.Infrastructure.Identity;

public sealed class JwtTokenService(IOptions<AuthOptions> options, IClock clock) : ITokenService
{
    private readonly AuthOptions _options = options.Value;

    public AccessTokenIssued IssueAccessToken(Guid userId, string email, bool emailVerified, IReadOnlyList<string> roles)
    {
        var now = clock.UtcNow;
        var expires = now.AddMinutes(_options.AccessTokenLifetimeMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new("email_verified", emailVerified ? "true" : "false"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var keyBytes = Encoding.UTF8.GetBytes(_options.JwtSigningKey);
        var signingKey = new SymmetricSecurityKey(keyBytes);
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.JwtIssuer,
            audience: _options.JwtAudience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds);

        return new AccessTokenIssued(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public RefreshTokenIssued CreateRefreshToken()
    {
        // 32 bytes = 256 bits cryptographically random
        var bytes = RandomNumberGenerator.GetBytes(32);
        var raw = Base64UrlEncoder.Encode(bytes);
        return new RefreshTokenIssued(raw, HashRefreshToken(raw));
    }

    public string HashRefreshToken(string rawToken)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}

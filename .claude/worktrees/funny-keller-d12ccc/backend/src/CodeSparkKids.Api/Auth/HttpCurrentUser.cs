using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CodeSparkKids.Application.Common.Interfaces;

namespace CodeSparkKids.Api.Auth;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? UserId
    {
        get
        {
            var user = accessor.HttpContext?.User;
            return user?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                   ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
    }

    public string? Role => accessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;

    public bool IsAuthenticated => accessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}

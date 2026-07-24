using CodeSparkKids.Application.Common.Auth;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Api.Auth;

/// <summary>
/// Sets / reads / clears the HttpOnly refresh-token cookie.
/// SameSite=Strict, Secure in production, scoped to the auth path.
/// </summary>
public sealed class RefreshCookie(IOptions<AuthOptions> options)
{
    private readonly AuthOptions _options = options.Value;

    public string Name => _options.CookieName;

    public string? Read(HttpRequest request) =>
        request.Cookies.TryGetValue(_options.CookieName, out var value) ? value : null;

    public void Set(HttpResponse response, string rawToken, DateTime expiresAtUtc)
    {
        response.Cookies.Append(_options.CookieName, rawToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = _options.RequireHttps,
            SameSite = SameSiteMode.Strict,
            Path = _options.CookiePath,
            Domain = string.IsNullOrWhiteSpace(_options.CookieDomain) ? null : _options.CookieDomain,
            Expires = new DateTimeOffset(expiresAtUtc, TimeSpan.Zero),
            IsEssential = true,
        });
    }

    public void Clear(HttpResponse response)
    {
        response.Cookies.Append(_options.CookieName, string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure = _options.RequireHttps,
            SameSite = SameSiteMode.Strict,
            Path = _options.CookiePath,
            Domain = string.IsNullOrWhiteSpace(_options.CookieDomain) ? null : _options.CookieDomain,
            Expires = DateTimeOffset.UnixEpoch,
        });
    }
}

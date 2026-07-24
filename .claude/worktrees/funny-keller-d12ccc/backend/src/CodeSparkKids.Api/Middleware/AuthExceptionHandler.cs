using CodeSparkKids.Application.Common.Auth;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Middleware;

/// <summary>
/// Maps <see cref="AuthException"/> to a ProblemDetails 4xx response with a
/// stable <c>type</c> URI and translation-key title. Sets <c>Retry-After</c>
/// when present. Must be registered BEFORE the generic exception handler.
/// </summary>
public sealed class AuthExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not AuthException auth) return false;

        httpContext.Response.StatusCode = auth.StatusCode;
        if (auth.RetryAfter is { } ra && ra.TotalSeconds > 0)
        {
            httpContext.Response.Headers["Retry-After"] = ((int)Math.Ceiling(ra.TotalSeconds)).ToString();
        }

        var problem = new ProblemDetails
        {
            Status = auth.StatusCode,
            Type = auth.ProblemType,
            Title = auth.TitleKey,
            Instance = httpContext.Request.Path,
        };

        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}

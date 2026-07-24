using CodeSparkKids.Application.Common.Catalog;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CodeSparkKids.Api.Middleware;

/// <summary>
/// Maps <see cref="CatalogException"/> to a ProblemDetails response with a
/// stable <c>type</c> URI and translation-key title. Must be registered BEFORE
/// the generic exception handler. Public 404s carry no detail about whether
/// hidden content exists.
/// </summary>
public sealed class CatalogExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not CatalogException catalog) return false;

        httpContext.Response.StatusCode = catalog.StatusCode;

        var problem = new ProblemDetails
        {
            Status = catalog.StatusCode,
            Type = catalog.ProblemType,
            Title = catalog.TitleKey,
            Instance = httpContext.Request.Path,
        };

        if (catalog.Extensions is not null)
        {
            foreach (var (key, value) in catalog.Extensions)
                problem.Extensions[key] = value;
        }

        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}

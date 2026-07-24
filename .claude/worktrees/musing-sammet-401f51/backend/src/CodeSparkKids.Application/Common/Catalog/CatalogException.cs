namespace CodeSparkKids.Application.Common.Catalog;

/// <summary>
/// Thrown by the catalog service to signal a known, client-facing failure
/// (not found, invalid filter, invalid pagination). The API layer catches
/// these and renders ProblemDetails. Mirrors the auth pattern: carries only a
/// stable type URI and a translation key, never user-facing English copy, and
/// never reveals whether hidden (draft/archived/deleted) content exists.
/// </summary>
public sealed class CatalogException(
    int statusCode,
    string problemType,
    string titleKey,
    IReadOnlyDictionary<string, object?>? extensions = null)
    : Exception(titleKey)
{
    public int StatusCode { get; } = statusCode;
    public string ProblemType { get; } = problemType;
    public string TitleKey { get; } = titleKey;

    /// <summary>Optional ProblemDetails extension members (e.g. the current
    /// server rowVersion on a concurrency conflict).</summary>
    public IReadOnlyDictionary<string, object?>? Extensions { get; } = extensions;
}

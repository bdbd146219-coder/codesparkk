using System.Text;
using System.Text.RegularExpressions;

namespace CodeSparkKids.Domain.Catalog;

/// <summary>
/// URL slug normalisation and validation for catalog entities. Slugs are the
/// stable, human-readable identifiers used in public URLs, so they are kept to
/// lowercase ASCII alphanumerics separated by single hyphens. Non-ASCII input
/// (e.g. Arabic titles) is stripped — callers should supply an English-ish
/// source string or an explicit transliterated slug.
/// </summary>
public static class Slug
{
    private static readonly Regex Valid = new("^[a-z0-9]+(-[a-z0-9]+)*$", RegexOptions.Compiled);

    /// <summary>
    /// Normalises arbitrary input into a valid slug: lowercased, spaces and
    /// underscores collapsed to single hyphens, all other non-alphanumeric
    /// characters dropped, leading/trailing hyphens trimmed.
    /// </summary>
    /// <exception cref="ArgumentException">
    /// Thrown when the input is null/blank or normalises to an empty string.
    /// </exception>
    public static string Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new ArgumentException("Slug source cannot be empty.", nameof(raw));

        var lower = raw.Trim().ToLowerInvariant();
        var sb = new StringBuilder(lower.Length);
        var lastWasHyphen = false;

        foreach (var ch in lower)
        {
            if (ch is (>= 'a' and <= 'z') or (>= '0' and <= '9'))
            {
                sb.Append(ch);
                lastWasHyphen = false;
            }
            else if (ch is ' ' or '-' or '_')
            {
                if (!lastWasHyphen && sb.Length > 0)
                {
                    sb.Append('-');
                    lastWasHyphen = true;
                }
            }
            // any other character (punctuation, non-ASCII) is dropped
        }

        var result = sb.ToString().Trim('-');
        if (result.Length == 0)
            throw new ArgumentException("Slug source normalises to an empty slug.", nameof(raw));

        return result;
    }

    /// <summary>True when <paramref name="slug"/> is already a valid slug.</summary>
    public static bool IsValid(string? slug) =>
        !string.IsNullOrEmpty(slug) && Valid.IsMatch(slug);
}

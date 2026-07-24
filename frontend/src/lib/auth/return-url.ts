/**
 * Validates a `?return=<path>` parameter so the login flow can't be used as
 * an open redirect. Accept only same-origin paths that:
 *   - start with a single "/"
 *   - do NOT start with "//" (protocol-relative URLs route off-site)
 *   - do NOT start with "/\" (Windows-style protocol smuggling)
 *   - contain no scheme (e.g. "javascript:")
 *   - parse as a relative URL whose origin matches the page origin
 */
export function safeReturnUrl(raw: string | null | undefined, fallback = '/parent'): string {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return fallback;
  if (raw.length > 2048) return fallback;

  // Must start with a single forward slash.
  if (!raw.startsWith('/')) return fallback;
  // Block protocol-relative URLs and Windows backslash smuggling.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  // Block any scheme — "javascript:", "data:", etc.
  if (/^\/[^/]*:/.test(raw)) return fallback;

  try {
    // If a `window` is available, validate against its origin; otherwise
    // a synthetic origin still catches anything that resolves off-site.
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://csk.local';
    const resolved = new URL(raw, base);
    if (resolved.origin !== base) return fallback;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return fallback;
  }
}

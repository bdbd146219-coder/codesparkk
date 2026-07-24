/**
 * Remove sensitive querystring parameters (verification / reset tokens) from
 * the visible URL after the page has read them. Reduces the chance of the
 * token leaking via browser history, screenshot sharing, or the Referer
 * header if any third-party script were to load later.
 *
 * Uses `history.replaceState` so the route does not change.
 */
export function stripSensitiveQuery(keys: readonly string[]): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of keys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, '', next);
    }
  } catch {
    /* malformed URL — leave it alone */
  }
}

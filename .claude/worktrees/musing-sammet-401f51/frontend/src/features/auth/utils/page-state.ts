/**
 * Dev-only `?state=…` mechanism used by the visual:qa pipeline to render
 * specific UI states without driving real API calls. The override is gated
 * behind `import.meta.env.DEV` so it can never trigger in a production
 * build — any non-dev caller passing `?state=…` sees the default flow.
 */
export function readDevState<T extends string>(
  search: URLSearchParams,
  allowed: readonly T[],
): T | null {
  if (!import.meta.env.DEV) return null;
  const raw = search.get('state');
  if (!raw) return null;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

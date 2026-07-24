import type { RequestOptions } from '../client';

/** Query-param value types accepted by the admin list endpoints. */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * Serialise a typed query object into a `?a=b&c=d` suffix, skipping
 * null / undefined / empty values. Returns `''` when nothing is set, so callers
 * can always append the result to a path.
 */
export function toQuery(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Force the bearer-token header on for an admin request while preserving any
 * caller-supplied options (e.g. an `AbortSignal`). Every admin catalog endpoint
 * is staff-only, so auth is never optional here.
 */
export function authed(options?: RequestOptions): RequestOptions {
  return { ...options, auth: true };
}

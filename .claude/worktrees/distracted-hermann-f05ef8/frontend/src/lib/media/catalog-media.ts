/**
 * Public catalog media resolver.
 *
 * The public catalog DTOs expose `thumbnailKey` / `heroKey` as **opaque storage
 * keys** (e.g. `courses/python/thumb.png`), not URLs. There is currently no
 * backend route that serves those keys and no CDN, so a key alone cannot become
 * a URL — see the C4E media-resolver finding in docs/roadmap.md.
 *
 * This helper is the single, safe place that turns a key into a renderable URL:
 *   - Empty / whitespace keys              → `null`
 *   - An already-absolute `https://` URL   → passed through (future contract may
 *                                            return full URLs; inert today)
 *   - Any other scheme / disk path / `//`  → `null` (never expose `file:`,
 *                                            `javascript:`, `data:`, `C:\…`, …)
 *   - A relative key, with a configured
 *     `VITE_MEDIA_BASE_URL` (or explicit
 *     `baseUrl`)                           → `<base>/<encoded key>`
 *   - A relative key, with no base         → `null` (gradient fallback; no fake URL)
 *
 * The backend serves keys via the public `GET /api/v1/media/{key}` endpoint
 * (C4F, image types only). Wiring it up is a one-liner for operators: set
 * `VITE_MEDIA_BASE_URL` to that endpoint — an absolute origin
 * (`http://localhost:5234/api/v1/media`) cross-origin in dev, or a same-origin
 * root-relative path (`/api/v1/media`) in prod. Until it is set, every key
 * resolves to `null` and the UI shows the branded fallback tile.
 */

const ENV_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL as string | undefined)?.trim() ?? '';

/** True for `scheme:` prefixes (http:, data:, file:, javascript:, `C:` drive) or `//host`. */
function looksAbsoluteOrSchemed(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) || value.startsWith('//');
}

function normalizeBase(baseUrl: string | undefined): string | null {
  const base = (baseUrl ?? ENV_BASE_URL).trim();
  if (!base) return null;
  // A same-origin, root-relative base (e.g. "/api/v1/media") — safe in prod when
  // the API and app share an origin. Reject protocol-relative "//host".
  if (base.startsWith('/') && !base.startsWith('//')) return base.replace(/\/+$/, '');
  // Otherwise require an explicit http(s) origin — never a bare path/disk root.
  if (!/^https?:\/\/.+/i.test(base)) return null;
  return base.replace(/\/+$/, '');
}

export interface ResolveMediaOptions {
  /** Overrides `VITE_MEDIA_BASE_URL`; primarily for tests. */
  baseUrl?: string;
}

/**
 * Resolve a catalog media storage key to a safe, renderable URL, or `null` when
 * no safe URL can be produced. Never throws; never returns a disk path.
 */
export function resolveCatalogMediaUrl(
  key: string | null | undefined,
  options: ResolveMediaOptions = {},
): string | null {
  const raw = key?.trim();
  if (!raw) return null;

  // Already a safe absolute URL from the backend → trust https only.
  if (/^https:\/\//i.test(raw)) return raw;
  // Anything else that is absolute / schemed / protocol-relative is unsafe here.
  if (looksAbsoluteOrSchemed(raw)) return null;

  const base = normalizeBase(options.baseUrl);
  if (!base) return null;

  const encodedKey = raw.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${base}/${encodedKey}`;
}

/** Whether a public media base URL is configured (real images can render). */
export function isCatalogMediaConfigured(baseUrl?: string): boolean {
  return normalizeBase(baseUrl) !== null;
}

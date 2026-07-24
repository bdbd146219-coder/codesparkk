import { describe, expect, it } from 'vitest';
import { isCatalogMediaConfigured, resolveCatalogMediaUrl } from '../catalog-media';

const BASE = 'https://cdn.codesparkkids.com';

describe('resolveCatalogMediaUrl', () => {
  it('returns null for empty / nullish / whitespace keys', () => {
    expect(resolveCatalogMediaUrl(null)).toBeNull();
    expect(resolveCatalogMediaUrl(undefined)).toBeNull();
    expect(resolveCatalogMediaUrl('')).toBeNull();
    expect(resolveCatalogMediaUrl('   ')).toBeNull();
  });

  it('returns null for a relative storage key when no base URL is configured', () => {
    // No VITE_MEDIA_BASE_URL in the test env → gradient fallback, never a fake URL.
    expect(resolveCatalogMediaUrl('courses/python/thumb.png')).toBeNull();
  });

  it('joins a relative key against a configured base, encoding segments', () => {
    expect(resolveCatalogMediaUrl('courses/python/thumb.png', { baseUrl: BASE })).toBe(
      `${BASE}/courses/python/thumb.png`,
    );
    expect(resolveCatalogMediaUrl('courses/a b.png', { baseUrl: BASE })).toBe(
      `${BASE}/courses/a%20b.png`,
    );
  });

  it('normalizes slashes (trailing base slash + leading key slash)', () => {
    expect(resolveCatalogMediaUrl('/courses/thumb.png', { baseUrl: `${BASE}/` })).toBe(
      `${BASE}/courses/thumb.png`,
    );
  });

  it('passes through an already-absolute https URL', () => {
    expect(resolveCatalogMediaUrl('https://img.example.com/a.png')).toBe(
      'https://img.example.com/a.png',
    );
    expect(resolveCatalogMediaUrl('HTTPS://img.example.com/a.png')).toBe(
      'HTTPS://img.example.com/a.png',
    );
  });

  it('never exposes unsafe schemes or disk paths', () => {
    for (const unsafe of [
      'http://insecure.example.com/a.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'file:///etc/passwd',
      'C:\\storage\\courses\\thumb.png',
      '//evil.example.com/a.png',
    ]) {
      expect(resolveCatalogMediaUrl(unsafe, { baseUrl: BASE })).toBeNull();
    }
  });

  it('rejects a base URL that is not an http(s) origin', () => {
    expect(resolveCatalogMediaUrl('courses/thumb.png', { baseUrl: 'cdn.example.com' })).toBeNull();
    expect(resolveCatalogMediaUrl('courses/thumb.png', { baseUrl: 'ftp://x/y' })).toBeNull();
  });

  it('supports a same-origin, root-relative base (prod), but not protocol-relative', () => {
    // Matches the C4F endpoint mounted at /api/v1/media on the app's own origin.
    expect(resolveCatalogMediaUrl('courses/python/thumb.png', { baseUrl: '/api/v1/media' })).toBe(
      '/api/v1/media/courses/python/thumb.png',
    );
    expect(resolveCatalogMediaUrl('courses/thumb.png', { baseUrl: '/api/v1/media/' })).toBe(
      '/api/v1/media/courses/thumb.png',
    );
    // Protocol-relative "//host" is not a safe base.
    expect(
      resolveCatalogMediaUrl('courses/thumb.png', { baseUrl: '//evil.example.com' }),
    ).toBeNull();
  });

  it('resolves against the dev endpoint origin (cross-origin absolute base)', () => {
    expect(
      resolveCatalogMediaUrl('courses/python/thumb.png', {
        baseUrl: 'http://localhost:5234/api/v1/media',
      }),
    ).toBe('http://localhost:5234/api/v1/media/courses/python/thumb.png');
  });
});

describe('isCatalogMediaConfigured', () => {
  it('reflects whether a valid http(s) base is available', () => {
    expect(isCatalogMediaConfigured(BASE)).toBe(true);
    expect(isCatalogMediaConfigured('http://localhost:9000')).toBe(true);
    expect(isCatalogMediaConfigured('')).toBe(false);
    expect(isCatalogMediaConfigured('not-a-url')).toBe(false);
    // Default (no VITE_MEDIA_BASE_URL in test env) is unconfigured.
    expect(isCatalogMediaConfigured()).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { safeReturnUrl } from '../return-url';

describe('safeReturnUrl', () => {
  it('returns the fallback when input is null/undefined/empty', () => {
    expect(safeReturnUrl(null)).toBe('/parent');
    expect(safeReturnUrl(undefined)).toBe('/parent');
    expect(safeReturnUrl('')).toBe('/parent');
  });

  it('accepts a clean same-origin path', () => {
    expect(safeReturnUrl('/parent')).toBe('/parent');
    expect(safeReturnUrl('/parent/children')).toBe('/parent/children');
    expect(safeReturnUrl('/parent?ref=x')).toBe('/parent?ref=x');
    expect(safeReturnUrl('/parent#section')).toBe('/parent#section');
  });

  it('rejects protocol-relative URLs that would leave the site', () => {
    expect(safeReturnUrl('//evil.com/x')).toBe('/parent');
    expect(safeReturnUrl('//evil.com')).toBe('/parent');
  });

  it('rejects absolute URLs with a scheme', () => {
    expect(safeReturnUrl('https://evil.com/x')).toBe('/parent');
    expect(safeReturnUrl('http://evil.com')).toBe('/parent');
    expect(safeReturnUrl('javascript:alert(1)')).toBe('/parent');
  });

  it('rejects paths that smuggle a scheme after the leading slash', () => {
    expect(safeReturnUrl('/javascript:alert(1)')).toBe('/parent');
    expect(safeReturnUrl('/data:text/html,evil')).toBe('/parent');
  });

  it('rejects Windows-style backslash smuggling', () => {
    expect(safeReturnUrl('/\\evil.com')).toBe('/parent');
  });

  it('rejects overlong input', () => {
    const long = '/parent?x=' + 'a'.repeat(3000);
    expect(safeReturnUrl(long)).toBe('/parent');
  });

  it('honours a custom fallback', () => {
    expect(safeReturnUrl(null, '/staff')).toBe('/staff');
    expect(safeReturnUrl('//evil', '/staff')).toBe('/staff');
  });
});

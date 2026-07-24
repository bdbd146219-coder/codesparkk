import { describe, expect, it } from 'vitest';
import { buildSearchParams, filtersToQuery, hasActiveFilters, parseFilters } from '../filters';

describe('parseFilters', () => {
  it('reads valid values and drops invalid ones', () => {
    const params = new URLSearchParams('q=web&active=inactive&sort=name&page=3');
    expect(parseFilters(params)).toEqual({
      q: 'web',
      active: 'inactive',
      sort: 'name',
      page: 3,
    });
  });

  it('drops unknown active/sort tokens and page<=1', () => {
    const params = new URLSearchParams('active=maybe&sort=random&page=1');
    expect(parseFilters(params)).toEqual({
      q: undefined,
      active: undefined,
      sort: undefined,
      page: undefined,
    });
  });

  it('trims and ignores a blank query', () => {
    expect(parseFilters(new URLSearchParams('q=%20%20')).q).toBeUndefined();
  });
});

describe('buildSearchParams', () => {
  it('serialises only non-empty values and omits page 1', () => {
    expect(buildSearchParams({ q: 'ai', active: 'active', sort: 'newest', page: 1 })).toEqual({
      q: 'ai',
      active: 'active',
      sort: 'newest',
    });
  });

  it('keeps page when greater than 1', () => {
    expect(buildSearchParams({ page: 2 })).toEqual({ page: '2' });
  });

  it('round-trips through parseFilters', () => {
    const values = { q: 'robotics', active: 'inactive' as const, sort: 'updated', page: 4 };
    expect(parseFilters(new URLSearchParams(buildSearchParams(values)))).toEqual(values);
  });
});

describe('filtersToQuery', () => {
  it('maps the active tri-state to isActive boolean', () => {
    expect(filtersToQuery({ active: 'active' }).isActive).toBe(true);
    expect(filtersToQuery({ active: 'inactive' }).isActive).toBe(false);
    expect(filtersToQuery({}).isActive).toBeUndefined();
  });

  it('passes q, sort, and page through, nulling empties', () => {
    expect(filtersToQuery({ q: 'x', sort: 'name', page: 2 })).toEqual({
      q: 'x',
      isActive: undefined,
      sort: 'name',
      page: 2,
    });
    expect(filtersToQuery({ page: 1 }).page).toBeUndefined();
  });
});

describe('hasActiveFilters', () => {
  it('is true for q or active, false for sort/page alone', () => {
    expect(hasActiveFilters({ q: 'x' })).toBe(true);
    expect(hasActiveFilters({ active: 'active' })).toBe(true);
    expect(hasActiveFilters({ sort: 'name', page: 3 })).toBe(false);
    expect(hasActiveFilters({})).toBe(false);
  });
});

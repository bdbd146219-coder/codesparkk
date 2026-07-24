import { describe, expect, it } from 'vitest';
import { buildSearchParams, filtersToQuery, hasActiveFilters, parseFilters } from '../filters';

describe('parseFilters', () => {
  it('reads valid values and drops invalid ones', () => {
    const params = new URLSearchParams(
      'q=web&status=Published&ageBand=Explorer&listed=listed&sort=title&page=2',
    );
    expect(parseFilters(params)).toEqual({
      q: 'web',
      status: 'Published',
      ageBand: 'Explorer',
      listed: 'listed',
      sort: 'title',
      page: 2,
    });
  });

  it('drops unknown enum tokens and page<=1', () => {
    const params = new URLSearchParams('status=Nope&ageBand=Grown&listed=maybe&sort=random&page=1');
    expect(parseFilters(params)).toEqual({
      q: undefined,
      status: undefined,
      ageBand: undefined,
      listed: undefined,
      sort: undefined,
      page: undefined,
    });
  });
});

describe('buildSearchParams', () => {
  it('serialises only non-empty values and omits page 1', () => {
    expect(
      buildSearchParams({
        q: 'ai',
        status: 'Draft',
        ageBand: 'Junior',
        listed: 'unlisted',
        sort: 'newest',
        page: 1,
      }),
    ).toEqual({ q: 'ai', status: 'Draft', ageBand: 'Junior', listed: 'unlisted', sort: 'newest' });
  });

  it('round-trips through parseFilters', () => {
    const values = {
      q: 'robotics',
      status: 'Archived',
      ageBand: 'Junior',
      listed: 'listed' as const,
      sort: 'status',
      page: 4,
    };
    expect(parseFilters(new URLSearchParams(buildSearchParams(values)))).toEqual(values);
  });
});

describe('filtersToQuery', () => {
  it('maps the listed tri-state to isListed boolean', () => {
    expect(filtersToQuery({ listed: 'listed' }).isListed).toBe(true);
    expect(filtersToQuery({ listed: 'unlisted' }).isListed).toBe(false);
    expect(filtersToQuery({}).isListed).toBeUndefined();
  });

  it('passes q/status/ageBand/sort/page through, nulling empties', () => {
    expect(
      filtersToQuery({ q: 'x', status: 'Published', ageBand: 'Explorer', sort: 'title', page: 3 }),
    ).toEqual({
      q: 'x',
      status: 'Published',
      ageBand: 'Explorer',
      isListed: undefined,
      sort: 'title',
      page: 3,
    });
    expect(filtersToQuery({ page: 1 }).page).toBeUndefined();
  });
});

describe('hasActiveFilters', () => {
  it('is true for q/status/ageBand/listed, false for sort/page alone', () => {
    expect(hasActiveFilters({ q: 'x' })).toBe(true);
    expect(hasActiveFilters({ status: 'Draft' })).toBe(true);
    expect(hasActiveFilters({ ageBand: 'Junior' })).toBe(true);
    expect(hasActiveFilters({ listed: 'listed' })).toBe(true);
    expect(hasActiveFilters({ sort: 'title', page: 2 })).toBe(false);
    expect(hasActiveFilters({})).toBe(false);
  });
});

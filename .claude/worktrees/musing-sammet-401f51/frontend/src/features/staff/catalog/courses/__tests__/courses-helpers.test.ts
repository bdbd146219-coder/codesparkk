import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { buildSearchParams, filtersToQuery, hasActiveFilters, parseFilters } from '../filters';
import {
  courseTitle,
  errorMessageKey,
  formatDate,
  toCategoryOptions,
  toViewModel,
  type CourseListItem,
} from '../format';
import { deliveryTypeKey, listedKey, publishStateMeta } from '../badge-meta';

describe('parseFilters', () => {
  it('reads valid values and drops page=1', () => {
    const sp = new URLSearchParams(
      'q=scratch&status=Draft&deliveryType=Live&difficulty=Advanced&ageBand=Explorer&category=web&listed=unlisted&sort=newest&page=3',
    );
    expect(parseFilters(sp)).toEqual({
      q: 'scratch',
      status: 'Draft',
      deliveryType: 'Live',
      difficulty: 'Advanced',
      ageBand: 'Explorer',
      category: 'web',
      listed: 'unlisted',
      sort: 'newest',
      page: 3,
    });
  });

  it('drops invalid enum values and page<=1', () => {
    const sp = new URLSearchParams('status=Bogus&listed=maybe&sort=weird&page=1');
    const values = parseFilters(sp);
    expect(values.status).toBeUndefined();
    expect(values.listed).toBeUndefined();
    expect(values.sort).toBeUndefined();
    expect(values.page).toBeUndefined();
  });
});

describe('buildSearchParams', () => {
  it('serialises only set values and omits page=1', () => {
    expect(buildSearchParams({ q: 'a', status: 'Draft', page: 2 })).toEqual({
      q: 'a',
      status: 'Draft',
      page: '2',
    });
    expect(buildSearchParams({ page: 1 })).toEqual({});
  });

  it('round-trips through parseFilters', () => {
    const values = { q: 'robotics', ageBand: 'Junior', listed: 'listed' as const, page: 2 };
    const params = new URLSearchParams(buildSearchParams(values));
    expect(parseFilters(params)).toEqual(values);
  });
});

describe('filtersToQuery', () => {
  it('maps the listed tri-state to isListed', () => {
    expect(filtersToQuery({ listed: 'listed' }).isListed).toBe(true);
    expect(filtersToQuery({ listed: 'unlisted' }).isListed).toBe(false);
    expect(filtersToQuery({}).isListed).toBeUndefined();
  });
});

describe('hasActiveFilters', () => {
  it('is true for narrowing filters only', () => {
    expect(hasActiveFilters({ q: 'a' })).toBe(true);
    expect(hasActiveFilters({ category: 'web' })).toBe(true);
    expect(hasActiveFilters({ sort: 'newest' })).toBe(false);
    expect(hasActiveFilters({ page: 2 })).toBe(false);
    expect(hasActiveFilters({})).toBe(false);
  });
});

describe('toViewModel', () => {
  const item = { id: 'c1', slug: 's', titleEn: 'X' } as CourseListItem;

  it('maps loading and error states', () => {
    expect(toViewModel({ isLoading: true, isError: false }, false)).toEqual({ status: 'loading' });
    expect(toViewModel({ isLoading: false, isError: true, error: new Error('x') }, false)).toEqual({
      status: 'error',
      messageKey: 'staff.catalog.courses.list.error.body',
    });
  });

  it('uses the forbidden message for a 403', () => {
    const vm = toViewModel(
      { isLoading: false, isError: true, error: new ApiError(403, 't', 'k') },
      false,
    );
    expect(vm).toEqual({
      status: 'error',
      messageKey: 'staff.catalog.courses.list.error.forbidden',
    });
  });

  it('flags filtered vs unfiltered empty', () => {
    expect(toViewModel({ isLoading: false, isError: false, data: { items: [] } }, true)).toEqual({
      status: 'empty',
      filtered: true,
    });
    expect(toViewModel({ isLoading: false, isError: false, data: { items: [] } }, false)).toEqual({
      status: 'empty',
      filtered: false,
    });
  });

  it('maps a populated page', () => {
    const vm = toViewModel(
      {
        isLoading: false,
        isError: false,
        data: { items: [item], page: 2, pageSize: 20, totalItems: 42, totalPages: 3 },
      },
      false,
    );
    expect(vm).toEqual({
      status: 'data',
      items: [item],
      page: 2,
      pageSize: 20,
      totalItems: 42,
      totalPages: 3,
    });
  });
});

describe('courseTitle', () => {
  it('prefers the active language then falls back', () => {
    const c = { titleEn: 'A', titleAr: 'ب', slug: 'a' } as CourseListItem;
    expect(courseTitle(c, 'en')).toBe('A');
    expect(courseTitle(c, 'ar')).toBe('ب');
    expect(courseTitle({ titleEn: null, titleAr: null, slug: 's' } as CourseListItem, 'en')).toBe(
      's',
    );
    expect(courseTitle({ titleEn: null, titleAr: null, slug: null } as CourseListItem, 'en')).toBe(
      '—',
    );
  });
});

describe('formatDate', () => {
  it('returns an em dash for missing/invalid input', () => {
    expect(formatDate(undefined, 'en')).toBe('—');
    expect(formatDate('not-a-date', 'en')).toBe('—');
  });

  it('formats a valid date to a non-empty string', () => {
    expect(formatDate('2026-06-20T09:00:00Z', 'en').length).toBeGreaterThan(0);
  });
});

describe('toCategoryOptions', () => {
  it('keeps only entries with a slug', () => {
    expect(
      toCategoryOptions({
        items: [
          { slug: 'web', nameEn: 'Web', nameAr: 'ويب' },
          { slug: null, nameEn: 'No slug' },
        ],
      }),
    ).toEqual([{ value: 'web', nameEn: 'Web', nameAr: 'ويب' }]);
  });
});

describe('badge helpers', () => {
  it('maps publish state to key + variant, with a safe fallback', () => {
    expect(publishStateMeta('Published')).toEqual({
      key: 'staff.catalog.enums.publishState.Published',
      variant: 'success',
    });
    expect(publishStateMeta('Draft')?.variant).toBe('secondary');
    expect(publishStateMeta(null)).toBeNull();
    expect(publishStateMeta('Weird')).toEqual({ key: 'Weird', variant: 'outline' });
  });

  it('maps enum-ish values to keys', () => {
    expect(deliveryTypeKey('Recorded')).toBe('staff.catalog.enums.deliveryType.Recorded');
    expect(deliveryTypeKey('Unknown')).toBe('Unknown');
    expect(deliveryTypeKey(null)).toBeNull();
    expect(listedKey(true)).toBe('staff.catalog.enums.listed.listed');
    expect(listedKey(false)).toBe('staff.catalog.enums.listed.unlisted');
  });

  it('errorMessageKey distinguishes 403', () => {
    expect(errorMessageKey(new ApiError(403, 't', 'k'))).toBe(
      'staff.catalog.courses.list.error.forbidden',
    );
    expect(errorMessageKey(new Error('x'))).toBe('staff.catalog.courses.list.error.body');
  });
});

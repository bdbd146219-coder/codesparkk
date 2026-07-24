import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  ageBandLabelKey,
  catalogErrorKey,
  deliveryLabelKey,
  difficultyLabelKey,
  toCatalogViewModel,
} from '../shared';

describe('toCatalogViewModel', () => {
  const err = 'catalog.courses.error.body';

  it('maps loading and error states', () => {
    expect(toCatalogViewModel({ isLoading: true, isError: false }, false, err)).toEqual({
      status: 'loading',
    });
    expect(toCatalogViewModel({ isLoading: false, isError: true }, false, err)).toEqual({
      status: 'error',
      messageKey: err,
    });
  });

  it('distinguishes a plain empty result from a filtered-empty one', () => {
    const data = { items: [], page: 1, totalItems: 0, totalPages: 0 };
    expect(toCatalogViewModel({ isLoading: false, isError: false, data }, false, err)).toEqual({
      status: 'empty',
      filtered: false,
    });
    expect(toCatalogViewModel({ isLoading: false, isError: false, data }, true, err)).toEqual({
      status: 'empty',
      filtered: true,
    });
  });

  it('returns data with paging and drops null items', () => {
    const data = {
      items: [{ slug: 'a' }, null, { slug: 'b' }],
      page: 2,
      totalItems: 14,
      totalPages: 3,
    };
    const vm = toCatalogViewModel<{ slug: string }>(
      { isLoading: false, isError: false, data },
      false,
      err,
    );
    expect(vm).toMatchObject({ status: 'data', page: 2, totalItems: 14, totalPages: 3 });
    if (vm.status === 'data') expect(vm.items.map((i) => i.slug)).toEqual(['a', 'b']);
  });
});

describe('label + error key helpers', () => {
  it('builds enum label keys and falls back for missing values', () => {
    expect(ageBandLabelKey('Junior')).toBe('staff.catalog.enums.ageBand.Junior');
    expect(deliveryLabelKey('Live')).toBe('staff.catalog.enums.deliveryType.Live');
    expect(difficultyLabelKey('Advanced')).toBe('staff.catalog.enums.difficulty.Advanced');
    expect(ageBandLabelKey(null)).toBe('catalog.common.unknown');
  });

  it('maps a 400 to invalidFilters and everything else to the generic body', () => {
    expect(catalogErrorKey(new ApiError(400, 'x', 'k'), 'catalog.courses.error')).toBe(
      'catalog.courses.error.invalidFilters',
    );
    expect(catalogErrorKey(new ApiError(500, 'x', 'k'), 'catalog.courses.error')).toBe(
      'catalog.courses.error.body',
    );
    expect(catalogErrorKey(undefined, 'catalog.courses.error')).toBe('catalog.courses.error.body');
  });
});

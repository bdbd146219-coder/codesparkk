import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathListResult } from '@/lib/api/admin/learning-paths';
import {
  errorMessageKey,
  formatDate,
  pathAltTitle,
  pathTitle,
  toViewModel,
  type LearningPathListItem,
} from '../format';

function path(overrides: Partial<LearningPathListItem> = {}): LearningPathListItem {
  return {
    id: 'p1',
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    ageBand: 'Junior',
    publishState: 'Published',
    isListed: true,
    itemCount: 6,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-20T09:00:00Z',
    publishedAt: '2026-05-01T09:00:00Z',
    archivedAt: null,
    rowVersion: 'RV1',
    ...overrides,
  } as LearningPathListItem;
}

function result(items: LearningPathListItem[]): AdminLearningPathListResult {
  return {
    items,
    page: 1,
    pageSize: 20,
    totalItems: items.length,
    totalPages: 1,
  } as AdminLearningPathListResult;
}

describe('toViewModel', () => {
  it('returns loading / error / empty / filtered-empty / data', () => {
    expect(toViewModel({ isLoading: true, isError: false }, false)).toEqual({ status: 'loading' });
    expect(
      toViewModel({ isLoading: false, isError: true, error: new Error('x') }, false).status,
    ).toBe('error');
    expect(toViewModel({ isLoading: false, isError: false, data: result([]) }, false)).toEqual({
      status: 'empty',
      filtered: false,
    });
    expect(toViewModel({ isLoading: false, isError: false, data: result([]) }, true)).toEqual({
      status: 'empty',
      filtered: true,
    });
    const vm = toViewModel({ isLoading: false, isError: false, data: result([path()]) }, false);
    expect(vm.status).toBe('data');
    if (vm.status === 'data') {
      expect(vm.items).toHaveLength(1);
      expect(vm.totalItems).toBe(1);
      expect(vm.totalPages).toBe(1);
    }
  });
});

describe('errorMessageKey', () => {
  it('uses a distinct key for 403', () => {
    expect(errorMessageKey(new ApiError(403, 'x', 'k'))).toBe(
      'staff.catalog.learningPaths.list.error.forbidden',
    );
    expect(errorMessageKey(new Error('x'))).toBe('staff.catalog.learningPaths.list.error.body');
  });
});

describe('pathTitle / pathAltTitle', () => {
  it('prefers the active language and exposes the other as alt', () => {
    expect(pathTitle(path(), 'en')).toBe('Junior Coder Journey');
    expect(pathTitle(path(), 'ar')).toBe('رحلة المبرمج الصغير');
    expect(pathAltTitle(path(), 'en')).toBe('رحلة المبرمج الصغير');
    expect(pathAltTitle(path(), 'ar')).toBe('Junior Coder Journey');
  });

  it('falls back to slug then em dash', () => {
    expect(pathTitle(path({ titleEn: null, titleAr: null, slug: 'only-slug' }), 'en')).toBe(
      'only-slug',
    );
    expect(pathTitle(path({ titleEn: '', titleAr: '', slug: '' }), 'en')).toBe('—');
  });
});

describe('formatDate', () => {
  it('formats a date and em-dashes missing/invalid input', () => {
    expect(formatDate('2026-06-20T09:00:00Z', 'en')).toMatch(/2026/);
    expect(formatDate(null, 'en')).toBe('—');
    expect(formatDate('not-a-date', 'en')).toBe('—');
  });
});

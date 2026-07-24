import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathDetail } from '@/lib/api/admin/learning-paths';
import {
  bilingual,
  detailTitle,
  formatDate,
  itemTitle,
  lifecycleActionsFor,
  normalizeTab,
  sortedItems,
  toDetailViewModel,
} from '../detail-helpers';

function path(overrides: Partial<AdminLearningPathDetail> = {}): AdminLearningPathDetail {
  return {
    id: 'p1',
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    summaryEn: 'Summary',
    summaryAr: 'ملخّص',
    ageBand: 'Junior',
    publishState: 'Draft',
    isListed: false,
    media: { thumbnailKey: null, thumbnailAlt: null, heroKey: null, promoVideoUrl: null },
    items: [],
    readiness: { isReady: true, items: [] },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    publishedAt: null,
    archivedAt: null,
    deletedAt: null,
    rowVersion: 'RV1',
    ...overrides,
  } as AdminLearningPathDetail;
}

describe('toDetailViewModel', () => {
  it('maps loading / 404 / 403 / generic error / data', () => {
    expect(toDetailViewModel({ isLoading: true, isError: false })).toEqual({ status: 'loading' });
    expect(
      toDetailViewModel({ isLoading: false, isError: true, error: new ApiError(404, 'x', 'k') }),
    ).toEqual({ status: 'notfound' });
    expect(
      toDetailViewModel({ isLoading: false, isError: true, error: new ApiError(403, 'x', 'k') }),
    ).toEqual({ status: 'forbidden' });
    expect(
      toDetailViewModel({ isLoading: false, isError: true, error: new Error('boom') }).status,
    ).toBe('error');
    const vm = toDetailViewModel({ isLoading: false, isError: false, data: path() });
    expect(vm.status).toBe('data');
  });

  it('treats missing data as not found', () => {
    expect(toDetailViewModel({ isLoading: false, isError: false, data: undefined })).toEqual({
      status: 'notfound',
    });
  });
});

describe('normalizeTab', () => {
  it('accepts known tabs and defaults unknown/blank to overview', () => {
    expect(normalizeTab('items')).toBe('items');
    expect(normalizeTab('publishing')).toBe('publishing');
    expect(normalizeTab('nope')).toBe('overview');
    expect(normalizeTab(null)).toBe('overview');
  });
});

describe('bilingual / detailTitle', () => {
  it('prefers the active language and falls back', () => {
    expect(bilingual('En', 'Ar', 'en')).toBe('En');
    expect(bilingual('En', 'Ar', 'ar')).toBe('Ar');
    expect(bilingual(null, 'Ar', 'en')).toBe('Ar');
    expect(bilingual('', '', 'en')).toBeUndefined();
  });

  it('falls back to slug then em dash for the title', () => {
    expect(detailTitle(path({ titleEn: null, titleAr: null, slug: 's' }), 'en')).toBe('s');
    expect(detailTitle(path({ titleEn: '', titleAr: '', slug: '' }), 'en')).toBe('—');
  });
});

describe('itemTitle', () => {
  it('prefers course title, then slug, then id', () => {
    expect(itemTitle({ courseTitleEn: 'T', courseSlug: 's', courseId: 'id' } as never)).toBe('T');
    expect(itemTitle({ courseTitleEn: null, courseSlug: 's', courseId: 'id' } as never)).toBe('s');
    expect(itemTitle({ courseTitleEn: null, courseSlug: null, courseId: 'id' } as never)).toBe(
      'id',
    );
  });
});

describe('sortedItems', () => {
  it('orders items by their order field', () => {
    const p = path({
      items: [
        { id: 'b', courseId: 'c2', order: 2 },
        { id: 'a', courseId: 'c1', order: 1 },
      ] as never,
    });
    expect(sortedItems(p).map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('formatDate', () => {
  it('formats and em-dashes missing/invalid', () => {
    expect(formatDate('2026-06-21T14:30:00Z', 'en')).toMatch(/2026/);
    expect(formatDate(null, 'en')).toBe('—');
    expect(formatDate('nope', 'en')).toBe('—');
  });
});

describe('lifecycleActionsFor', () => {
  it('returns the relevant transitions per state', () => {
    expect(lifecycleActionsFor('Draft')).toEqual(['publish', 'archive']);
    expect(lifecycleActionsFor('InReview')).toEqual(['publish', 'archive']);
    expect(lifecycleActionsFor('Published')).toEqual(['unpublish', 'archive']);
    expect(lifecycleActionsFor('Archived')).toEqual(['restore']);
    expect(lifecycleActionsFor(undefined)).toEqual([]);
  });
});

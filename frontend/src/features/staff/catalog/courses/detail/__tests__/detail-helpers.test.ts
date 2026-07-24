// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  bilingual,
  detailTitle,
  normalizeTab,
  toCourseDetailViewModel,
  type AdminCourseDetail,
} from '../detail-helpers';

describe('toCourseDetailViewModel', () => {
  it('maps loading', () => {
    expect(toCourseDetailViewModel({ isLoading: true, isError: false })).toEqual({
      status: 'loading',
    });
  });

  it('maps a 404 to notfound', () => {
    const vm = toCourseDetailViewModel({
      isLoading: false,
      isError: true,
      error: new ApiError(404, 't', 'k'),
    });
    expect(vm).toEqual({ status: 'notfound' });
  });

  it('maps a 403 to a forbidden error message', () => {
    const vm = toCourseDetailViewModel({
      isLoading: false,
      isError: true,
      error: new ApiError(403, 't', 'k'),
    });
    expect(vm).toEqual({
      status: 'error',
      messageKey: 'staff.catalog.courses.detail.error.forbidden',
    });
  });

  it('maps a generic error', () => {
    const vm = toCourseDetailViewModel({
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    });
    expect(vm).toEqual({ status: 'error', messageKey: 'staff.catalog.courses.detail.error.body' });
  });

  it('maps missing data (after success) to notfound', () => {
    expect(toCourseDetailViewModel({ isLoading: false, isError: false, data: undefined })).toEqual({
      status: 'notfound',
    });
  });

  it('maps loaded data', () => {
    const course = { id: 'c1', titleEn: 'X' } as AdminCourseDetail;
    expect(toCourseDetailViewModel({ isLoading: false, isError: false, data: course })).toEqual({
      status: 'data',
      course,
    });
  });
});

describe('bilingual / detailTitle', () => {
  it('prefers the active language then falls back', () => {
    expect(bilingual('A', 'ب', 'en')).toBe('A');
    expect(bilingual('A', 'ب', 'ar')).toBe('ب');
    expect(bilingual(null, 'ب', 'en')).toBe('ب');
    expect(bilingual('  ', null, 'en')).toBeUndefined();
  });

  it('detailTitle falls back to slug then em dash', () => {
    expect(detailTitle({ titleEn: 'T', slug: 's' } as AdminCourseDetail, 'en')).toBe('T');
    expect(
      detailTitle({ titleEn: null, titleAr: null, slug: 's' } as AdminCourseDetail, 'en'),
    ).toBe('s');
    expect(
      detailTitle({ titleEn: null, titleAr: null, slug: null } as AdminCourseDetail, 'en'),
    ).toBe('—');
  });
});

describe('normalizeTab', () => {
  it('accepts known tabs and defaults to overview', () => {
    expect(normalizeTab('publishing')).toBe('publishing');
    expect(normalizeTab('modules')).toBe('modules');
    expect(normalizeTab('bogus')).toBe('overview');
    expect(normalizeTab(null)).toBe('overview');
  });
});

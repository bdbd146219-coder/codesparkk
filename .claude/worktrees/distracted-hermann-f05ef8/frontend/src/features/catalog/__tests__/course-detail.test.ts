import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { CatalogCourseDetail } from '@/lib/api/catalog';
import {
  courseLocales,
  courseModules,
  courseOutcomes,
  coursePrice,
  toCourseDetailViewModel,
} from '../detail/course-detail';

describe('toCourseDetailViewModel', () => {
  const course = { slug: 'x', title: 'X' } as CatalogCourseDetail;

  it('maps loading, data, and a missing payload', () => {
    expect(toCourseDetailViewModel({ isLoading: true, isError: false })).toEqual({
      status: 'loading',
    });
    expect(toCourseDetailViewModel({ isLoading: false, isError: false, data: course })).toEqual({
      status: 'data',
      course,
    });
    expect(toCourseDetailViewModel({ isLoading: false, isError: false, data: undefined })).toEqual({
      status: 'notfound',
    });
  });

  it('maps a 404 to not-found and other failures to a retryable error', () => {
    expect(
      toCourseDetailViewModel({
        isLoading: false,
        isError: true,
        error: new ApiError(404, 'x', 'k'),
      }),
    ).toEqual({ status: 'notfound' });
    expect(
      toCourseDetailViewModel({
        isLoading: false,
        isError: true,
        error: new ApiError(500, 'x', 'k'),
      }),
    ).toEqual({ status: 'error', messageKey: 'catalog.courses.detail.error.body' });
  });
});

describe('coursePrice', () => {
  it('treats Free / missing model as free', () => {
    expect(coursePrice({ model: 'Free', amount: null, currency: null })).toEqual({ kind: 'free' });
    expect(coursePrice(null)).toEqual({ kind: 'free' });
  });

  it('returns an amount when a priced model carries amount + currency', () => {
    expect(coursePrice({ model: 'OneTime', amount: 49, currency: 'USD' })).toEqual({
      kind: 'amount',
      amount: 49,
      currency: 'USD',
    });
  });

  it('falls back to the model when a priced model has no amount', () => {
    expect(coursePrice({ model: 'Subscription', amount: null, currency: null })).toEqual({
      kind: 'model',
      model: 'Subscription',
    });
  });
});

describe('course field helpers', () => {
  it('orders modules by order and drops blank/unknown data safely', () => {
    const course = {
      modulesPreview: [
        { title: 'B', summary: '', order: 2 },
        { title: 'A', summary: '', order: 1 },
      ],
      outcomes: ['Learn', '', '  ', 'Build'],
      availableLocales: ['en', 'fr', 'ar'],
    } as CatalogCourseDetail;

    expect(courseModules(course).map((m) => m.title)).toEqual(['A', 'B']);
    expect(courseOutcomes(course)).toEqual(['Learn', 'Build']);
    expect(courseLocales(course)).toEqual(['en', 'ar']);
  });

  it('returns empty collections when fields are absent', () => {
    const course = {} as CatalogCourseDetail;
    expect(courseModules(course)).toEqual([]);
    expect(courseOutcomes(course)).toEqual([]);
    expect(courseLocales(course)).toEqual([]);
  });
});

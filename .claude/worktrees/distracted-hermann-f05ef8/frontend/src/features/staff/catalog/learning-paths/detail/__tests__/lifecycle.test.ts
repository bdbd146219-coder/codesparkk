import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  isHighImpactAction,
  lifecycleActionSpecs,
  lifecycleErrorKey,
  readinessFromError,
} from '../lifecycle';

describe('lifecycleActionSpecs', () => {
  it('offers an enabled Publish plus Archive for a ready Draft/InReview', () => {
    for (const state of ['Draft', 'InReview']) {
      const specs = lifecycleActionSpecs(state, true);
      expect(specs.map((s) => s.action)).toEqual(['publish', 'archive']);
      expect(specs.find((s) => s.action === 'publish')?.disabled).toBe(false);
    }
  });

  it('disables Publish with a notReady reason when the Draft is not ready', () => {
    const specs = lifecycleActionSpecs('Draft', false);
    const publish = specs.find((s) => s.action === 'publish');
    expect(publish?.disabled).toBe(true);
    expect(publish?.reason).toBe('notReady');
    // Archive is still available regardless of readiness.
    expect(specs.find((s) => s.action === 'archive')?.disabled).toBe(false);
  });

  it('offers Unpublish + Archive for Published and Restore for Archived', () => {
    expect(lifecycleActionSpecs('Published', true).map((s) => s.action)).toEqual([
      'unpublish',
      'archive',
    ]);
    expect(lifecycleActionSpecs('Archived', true).map((s) => s.action)).toEqual(['restore']);
    expect(lifecycleActionSpecs(undefined, true)).toEqual([]);
  });
});

describe('isHighImpactAction', () => {
  it('flags unpublish and archive but not publish/restore', () => {
    expect(isHighImpactAction('archive')).toBe(true);
    expect(isHighImpactAction('unpublish')).toBe(true);
    expect(isHighImpactAction('publish')).toBe(false);
    expect(isHighImpactAction('restore')).toBe(false);
  });
});

describe('readinessFromError', () => {
  it('narrows the readiness extension from a 422 publish-blocked ApiError', () => {
    const err = new ApiError(422, 'x', 'k', undefined, undefined, {
      readiness: {
        isReady: false,
        items: [
          { code: 'no-published-course', messageKey: 'learningPaths.readiness.noPublishedCourse' },
        ],
      },
    });
    const readiness = readinessFromError(err);
    expect(readiness?.isReady).toBe(false);
    expect(readiness?.items?.[0]?.code).toBe('no-published-course');
  });

  it('returns null when there is no readiness extension', () => {
    expect(readinessFromError(new ApiError(409, 'x', 'k'))).toBeNull();
    expect(readinessFromError(new Error('boom'))).toBeNull();
  });
});

describe('lifecycleErrorKey', () => {
  const base = 'staff.catalog.learningPaths.detail.publishing.error';
  it('maps status codes to safe i18n keys', () => {
    expect(lifecycleErrorKey(new ApiError(400, 'x', 'k'))).toBe(`${base}.invalidState`);
    expect(lifecycleErrorKey(new ApiError(403, 'x', 'k'))).toBe(`${base}.forbidden`);
    expect(lifecycleErrorKey(new ApiError(404, 'x', 'k'))).toBe(`${base}.notFound`);
    expect(lifecycleErrorKey(new ApiError(500, 'x', 'k'))).toBe(`${base}.generic`);
    expect(lifecycleErrorKey(new Error('network'))).toBe(`${base}.generic`);
  });
});

import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  isHighImpactAction,
  lifecycleActionsFor,
  lifecycleErrorKey,
  readinessFromError,
  type LifecycleAction,
} from '../lifecycle';

const ERR = 'staff.catalog.courses.detail.publishing.error';

describe('lifecycleActionsFor', () => {
  it('offers Publish (enabled) and Archive for a ready Draft', () => {
    const specs = lifecycleActionsFor('Draft', true);
    expect(specs.map((s) => s.action)).toEqual(['publish', 'archive']);
    const publish = specs.find((s) => s.action === 'publish');
    expect(publish?.disabled).toBe(false);
    expect(publish?.reason).toBeUndefined();
  });

  it('disables Publish with a reason for a not-ready Draft', () => {
    const specs = lifecycleActionsFor('Draft', false);
    const publish = specs.find((s) => s.action === 'publish');
    expect(publish?.disabled).toBe(true);
    expect(publish?.reason).toBe('notReady');
  });

  it('treats InReview like Draft', () => {
    expect(lifecycleActionsFor('InReview', true).map((s) => s.action)).toEqual([
      'publish',
      'archive',
    ]);
  });

  it('offers Unpublish and Archive for a Published course (no publish/restore)', () => {
    expect(lifecycleActionsFor('Published', true).map((s) => s.action)).toEqual([
      'unpublish',
      'archive',
    ]);
  });

  it('offers only Restore for an Archived course', () => {
    expect(lifecycleActionsFor('Archived', true).map((s) => s.action)).toEqual(['restore']);
  });

  it('offers nothing for an unknown state', () => {
    expect(lifecycleActionsFor(null, true)).toEqual([]);
    expect(lifecycleActionsFor('Weird', true)).toEqual([]);
  });
});

describe('isHighImpactAction', () => {
  it('flags archive and unpublish, not publish or restore', () => {
    const expected: Record<LifecycleAction, boolean> = {
      archive: true,
      unpublish: true,
      publish: false,
      restore: false,
    };
    (Object.keys(expected) as LifecycleAction[]).forEach((a) =>
      expect(isHighImpactAction(a)).toBe(expected[a]),
    );
  });
});

describe('readinessFromError', () => {
  it('extracts the readiness checklist from a 422 ApiError', () => {
    const err = new ApiError(422, 'x', 'k', undefined, undefined, {
      readiness: { isReady: false, items: [{ code: 'thumbnail-missing' }] },
    });
    const readiness = readinessFromError(err);
    expect(readiness?.isReady).toBe(false);
    expect(readiness?.items?.[0]?.code).toBe('thumbnail-missing');
  });

  it('returns null for an error without a readiness extension', () => {
    expect(readinessFromError(new ApiError(422, 'x', 'k'))).toBeNull();
    expect(readinessFromError(new Error('nope'))).toBeNull();
    expect(readinessFromError(undefined)).toBeNull();
  });
});

describe('lifecycleErrorKey', () => {
  it('maps statuses to safe message keys', () => {
    expect(lifecycleErrorKey(new ApiError(400, 'x', 'k'))).toBe(`${ERR}.invalidState`);
    expect(lifecycleErrorKey(new ApiError(401, 'x', 'k'))).toBe(`${ERR}.forbidden`);
    expect(lifecycleErrorKey(new ApiError(403, 'x', 'k'))).toBe(`${ERR}.forbidden`);
    expect(lifecycleErrorKey(new ApiError(404, 'x', 'k'))).toBe(`${ERR}.notFound`);
    expect(lifecycleErrorKey(new ApiError(500, 'x', 'k'))).toBe(`${ERR}.generic`);
    expect(lifecycleErrorKey(new Error('network'))).toBe(`${ERR}.generic`);
  });
});

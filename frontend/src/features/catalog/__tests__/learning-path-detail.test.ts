import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { CatalogPathDetail } from '@/lib/api/catalog';
import {
  pathCourses,
  pathDisplayTitle,
  toLearningPathDetailViewModel,
} from '../detail/learning-path-detail';

describe('toLearningPathDetailViewModel', () => {
  const path = { slug: 'p', title: 'P' } as CatalogPathDetail;

  it('maps loading, data, and a missing payload', () => {
    expect(toLearningPathDetailViewModel({ isLoading: true, isError: false })).toEqual({
      status: 'loading',
    });
    expect(toLearningPathDetailViewModel({ isLoading: false, isError: false, data: path })).toEqual(
      {
        status: 'data',
        path,
      },
    );
    expect(
      toLearningPathDetailViewModel({ isLoading: false, isError: false, data: undefined }),
    ).toEqual({ status: 'notfound' });
  });

  it('maps a 404 to not-found and other failures to a retryable error', () => {
    expect(
      toLearningPathDetailViewModel({
        isLoading: false,
        isError: true,
        error: new ApiError(404, 'x', 'k'),
      }),
    ).toEqual({ status: 'notfound' });
    expect(
      toLearningPathDetailViewModel({
        isLoading: false,
        isError: true,
        error: new ApiError(500, 'x', 'k'),
      }),
    ).toEqual({ status: 'error', messageKey: 'catalog.learningPaths.detail.error.body' });
  });
});

describe('path field helpers', () => {
  it('keeps member courses in order and drops nullish entries', () => {
    const path = {
      title: 'Junior Coder Journey',
      courses: [{ slug: 'a' }, null, { slug: 'b' }],
    } as CatalogPathDetail;
    expect(pathCourses(path).map((c) => c.slug)).toEqual(['a', 'b']);
    expect(pathDisplayTitle(path)).toBe('Junior Coder Journey');
  });

  it('falls back to slug then em dash for the title, and empty courses to []', () => {
    expect(pathDisplayTitle({ slug: 'my-path' } as CatalogPathDetail)).toBe('my-path');
    expect(pathDisplayTitle({} as CatalogPathDetail)).toBe('—');
    expect(pathCourses({} as CatalogPathDetail)).toEqual([]);
  });
});

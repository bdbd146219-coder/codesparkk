import type { AdminCategoryListQuery } from '@/lib/api/admin/categories';
import type { AdminCourseListQuery } from '@/lib/api/admin/courses';
import type { AdminLearningPathListQuery } from '@/lib/api/admin/learning-paths';

/**
 * Query-key factory for the admin catalog. Follows the standard hierarchical
 * convention so callers can invalidate at the right granularity:
 *
 *   <resource>.all         → everything for the resource
 *   <resource>.lists()     → every list (invalidate after any write)
 *   <resource>.list(f)     → one filtered list
 *   <resource>.details()   → every detail
 *   <resource>.detail(id)  → one detail
 *
 * Lists key off the filter object; React Query hashes keys deterministically
 * (object key order and `undefined` values do not affect the hash), so passing
 * the typed filter object straight through is stable across renders.
 */

const ROOT = ['admin-catalog'] as const;

export const courseKeys = {
  all: [...ROOT, 'courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters?: AdminCourseListQuery) => [...courseKeys.lists(), filters ?? {}] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string | undefined) => [...courseKeys.details(), id] as const,
};

export const categoryKeys = {
  all: [...ROOT, 'categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: AdminCategoryListQuery) => [...categoryKeys.lists(), filters ?? {}] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string | undefined) => [...categoryKeys.details(), id] as const,
};

export const learningPathKeys = {
  all: [...ROOT, 'learning-paths'] as const,
  lists: () => [...learningPathKeys.all, 'list'] as const,
  list: (filters?: AdminLearningPathListQuery) =>
    [...learningPathKeys.lists(), filters ?? {}] as const,
  details: () => [...learningPathKeys.all, 'detail'] as const,
  detail: (id: string | undefined) => [...learningPathKeys.details(), id] as const,
};

import { ApiError } from '@/lib/api/errors';
import type { CatalogCourseCard, CatalogPathDetail } from '@/lib/api/catalog';

/**
 * Pure helpers for the public learning-path detail page (C4C), mirroring the
 * course-detail helpers. The learning-path detail DTO is small — slug, title,
 * summary, ageBand, thumbnail, and an ordered list of member `courses`
 * (full `CourseCardDto`s, so the browse `PublicCourseCard` is reused directly).
 */

export type LearningPathDetailViewModel =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; messageKey: string }
  | { status: 'data'; path: CatalogPathDetail };

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: CatalogPathDetail | undefined;
}

export function toLearningPathDetailViewModel(query: QueryLike): LearningPathDetailViewModel {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404)
      return { status: 'notfound' };
    return { status: 'error', messageKey: 'catalog.learningPaths.detail.error.body' };
  }
  if (!query.data) return { status: 'notfound' };
  return { status: 'data', path: query.data };
}

/** Best display title, with a slug/em-dash fallback so a heading is never blank. */
export function pathDisplayTitle(path: CatalogPathDetail): string {
  return path.title?.trim() || path.slug || '—';
}

/** The member courses in returned order, dropping any nullish entries. */
export function pathCourses(path: CatalogPathDetail): CatalogCourseCard[] {
  return (path.courses ?? []).filter((c): c is CatalogCourseCard => c != null);
}

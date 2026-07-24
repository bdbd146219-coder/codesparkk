import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathListResult } from '@/lib/api/admin/learning-paths';

export type LearningPathListItem = NonNullable<AdminLearningPathListResult['items']>[number];

/** Discriminated view state the presentational list renders from. */
export type LearningPathsViewModel =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'empty'; filtered: boolean }
  | {
      status: 'data';
      items: LearningPathListItem[];
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: AdminLearningPathListResult | undefined;
}

/** Map an i18n key for a failed list fetch — a 403 gets a distinct message. */
export function errorMessageKey(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'staff.catalog.learningPaths.list.error.forbidden';
  }
  return 'staff.catalog.learningPaths.list.error.body';
}

/** Reduce a React Query result + filter state into the list view model. */
export function toViewModel(query: QueryLike, filtered: boolean): LearningPathsViewModel {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) return { status: 'error', messageKey: errorMessageKey(query.error) };

  const items = query.data?.items ?? [];
  if (items.length === 0) return { status: 'empty', filtered };

  return {
    status: 'data',
    items,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? items.length,
    totalItems: query.data?.totalItems ?? items.length,
    totalPages: Math.max(query.data?.totalPages ?? 1, 1),
  };
}

/** Best display title for the active language, falling back to the other, then slug. */
export function pathTitle(path: LearningPathListItem, lang: string): string {
  const en = path.titleEn?.trim();
  const ar = path.titleAr?.trim();
  const primary = lang.startsWith('ar') ? ar || en : en || ar;
  return primary || path.slug || '—';
}

/** The secondary-language title, shown under the primary when it differs. */
export function pathAltTitle(path: LearningPathListItem, lang: string): string | undefined {
  const alt = (lang.startsWith('ar') ? path.titleEn : path.titleAr)?.trim();
  return alt || undefined;
}

/** Short, locale-aware date. Returns an em dash for missing/invalid input. */
export function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar' : 'en', {
    dateStyle: 'medium',
  }).format(date);
}

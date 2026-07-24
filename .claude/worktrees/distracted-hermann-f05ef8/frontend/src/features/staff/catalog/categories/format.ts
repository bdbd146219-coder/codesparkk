import { ApiError } from '@/lib/api/errors';
import type { AdminCategoryListResult } from '@/lib/api/admin/categories';

export type CategoryListItem = NonNullable<AdminCategoryListResult['items']>[number];

/** Discriminated view state the presentational list renders from. */
export type CategoriesViewModel =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'empty'; filtered: boolean }
  | {
      status: 'data';
      items: CategoryListItem[];
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: AdminCategoryListResult | undefined;
}

/** Map an i18n key for a failed list fetch — a 403 gets a distinct message. */
export function errorMessageKey(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'staff.catalog.categories.list.error.forbidden';
  }
  return 'staff.catalog.categories.list.error.body';
}

/** Reduce a React Query result + filter state into the list view model. */
export function toViewModel(query: QueryLike, filtered: boolean): CategoriesViewModel {
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

/** Primary display name for the active language, falling back to the other, then slug. */
export function categoryName(category: CategoryListItem, lang: string): string {
  const en = category.nameEn?.trim();
  const ar = category.nameAr?.trim();
  const primary = lang.startsWith('ar') ? ar || en : en || ar;
  return primary || category.slug || '—';
}

/** The secondary-language name, shown under the primary when it differs. */
export function categoryAltName(category: CategoryListItem, lang: string): string | undefined {
  const alt = (lang.startsWith('ar') ? category.nameEn : category.nameAr)?.trim();
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

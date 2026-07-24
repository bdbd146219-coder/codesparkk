import { ApiError } from '@/lib/api/errors';

/**
 * Shared view-model + label helpers for the public catalog browse pages.
 * A paged React Query result is reduced into a small discriminated union the
 * views render from, so loading / error / empty / data are handled uniformly
 * across courses and learning paths.
 */

export interface PagedLike<T> {
  items?: (T | null | undefined)[] | null;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
}

export interface QueryLike<T> {
  isLoading: boolean;
  isError: boolean;
  data?: PagedLike<T> | undefined;
}

export type CatalogViewModel<T> =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'empty'; filtered: boolean }
  | { status: 'data'; items: T[]; page: number; totalItems: number; totalPages: number };

/** Reduce a React Query paged result into the browse view model. */
export function toCatalogViewModel<T>(
  query: QueryLike<T>,
  hasActiveFilters: boolean,
  errorKey: string,
): CatalogViewModel<T> {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) return { status: 'error', messageKey: errorKey };
  const data = query.data;
  const items = (data?.items ?? []).filter((i): i is T => i != null);
  if (items.length === 0) return { status: 'empty', filtered: hasActiveFilters };
  return {
    status: 'data',
    items,
    page: data?.page ?? 1,
    totalItems: data?.totalItems ?? items.length,
    totalPages: data?.totalPages ?? 1,
  };
}

/** i18n key for an enum value, reusing the shared admin enum labels. */
export function ageBandLabelKey(value: string | null | undefined): string {
  return value ? `staff.catalog.enums.ageBand.${value}` : 'catalog.common.unknown';
}
export function deliveryLabelKey(value: string | null | undefined): string {
  return value ? `staff.catalog.enums.deliveryType.${value}` : 'catalog.common.unknown';
}
export function difficultyLabelKey(value: string | null | undefined): string {
  return value ? `staff.catalog.enums.difficulty.${value}` : 'catalog.common.unknown';
}

/** Map an unexpected browse failure to a safe i18n key (400 → invalid filters). */
export function catalogErrorKey(error: unknown, base: string): string {
  if (error instanceof ApiError && error.status === 400) return `${base}.invalidFilters`;
  return `${base}.body`;
}

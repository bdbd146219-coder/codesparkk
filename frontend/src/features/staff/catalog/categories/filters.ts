import type { AdminCategoryListQuery } from '@/lib/api/admin/categories';

/**
 * Category-list filter model. The single source of truth for filters is the URL
 * query string; this module converts between `URLSearchParams`, the UI's
 * `CategoryFilterValues`, and the `AdminCategoryListQuery` the API expects.
 *
 * `active` is a UI tri-state (`active` / `inactive` / all) mapped to the boolean
 * `isActive`. `sort` mirrors the backend tokens; the default (`order`) is the
 * empty value, so it is not serialised.
 */

export const ACTIVE_VALUES = ['active', 'inactive'] as const;
export const SORT_VALUES = ['name', 'newest', 'updated'] as const;

export type ActiveFilter = (typeof ACTIVE_VALUES)[number];

export interface CategoryFilterValues {
  q?: string;
  active?: ActiveFilter;
  sort?: string;
  page?: number;
}

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/** Read filter values from the URL query string. Invalid values are dropped. */
export function parseFilters(params: URLSearchParams): CategoryFilterValues {
  const q = params.get('q')?.trim();
  const pageRaw = Number.parseInt(params.get('page') ?? '', 10);
  return {
    q: q ? q : undefined,
    active: pick(params.get('active'), ACTIVE_VALUES),
    sort: pick(params.get('sort'), SORT_VALUES),
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : undefined,
  };
}

/** Serialise filter values to a plain record for `setSearchParams` (omits empties). */
export function buildSearchParams(values: CategoryFilterValues): Record<string, string> {
  const out: Record<string, string> = {};
  if (values.q) out.q = values.q;
  if (values.active) out.active = values.active;
  if (values.sort) out.sort = values.sort;
  if (values.page && values.page > 1) out.page = String(values.page);
  return out;
}

/** Convert UI filter values to the typed API query. */
export function filtersToQuery(values: CategoryFilterValues): AdminCategoryListQuery {
  return {
    q: values.q || undefined,
    isActive: values.active === 'active' ? true : values.active === 'inactive' ? false : undefined,
    sort: values.sort || undefined,
    page: values.page && values.page > 1 ? values.page : undefined,
  };
}

/** True when any narrowing filter is active (sort and page are not narrowing). */
export function hasActiveFilters(values: CategoryFilterValues): boolean {
  return Boolean(values.q || values.active);
}

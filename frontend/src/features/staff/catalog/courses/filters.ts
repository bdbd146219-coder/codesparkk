import type { AdminCourseListQuery } from '@/lib/api/admin/courses';

/**
 * Course-list filter model. The single source of truth for filters is the URL
 * query string; this module converts between `URLSearchParams`, the UI's
 * `CourseFilterValues`, and the `AdminCourseListQuery` the API expects.
 *
 * Filter values mirror the backend enum names (e.g. `Draft`, `Recorded`) so they
 * pass straight through to the API; `listed` is a UI tri-state mapped to the
 * boolean `isListed`.
 */

export const STATUS_VALUES = ['Draft', 'InReview', 'Published', 'Archived'] as const;
export const DELIVERY_VALUES = ['Recorded', 'Live', 'Hybrid'] as const;
export const DIFFICULTY_VALUES = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const AGE_BAND_VALUES = ['Junior', 'Explorer'] as const;
export const LISTED_VALUES = ['listed', 'unlisted'] as const;
export const SORT_VALUES = ['newest', 'title', 'status'] as const;

export type ListedFilter = (typeof LISTED_VALUES)[number];

export interface CourseFilterValues {
  q?: string;
  status?: string;
  deliveryType?: string;
  difficulty?: string;
  ageBand?: string;
  category?: string;
  listed?: ListedFilter;
  sort?: string;
  page?: number;
}

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/** Read filter values from the URL query string. Invalid values are dropped. */
export function parseFilters(params: URLSearchParams): CourseFilterValues {
  const q = params.get('q')?.trim();
  const pageRaw = Number.parseInt(params.get('page') ?? '', 10);
  return {
    q: q ? q : undefined,
    status: pick(params.get('status'), STATUS_VALUES),
    deliveryType: pick(params.get('deliveryType'), DELIVERY_VALUES),
    difficulty: pick(params.get('difficulty'), DIFFICULTY_VALUES),
    ageBand: pick(params.get('ageBand'), AGE_BAND_VALUES),
    category: params.get('category')?.trim() || undefined,
    listed: pick(params.get('listed'), LISTED_VALUES),
    sort: pick(params.get('sort'), SORT_VALUES),
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : undefined,
  };
}

/** Serialise filter values to a plain record for `setSearchParams` (omits empties). */
export function buildSearchParams(values: CourseFilterValues): Record<string, string> {
  const out: Record<string, string> = {};
  if (values.q) out.q = values.q;
  if (values.status) out.status = values.status;
  if (values.deliveryType) out.deliveryType = values.deliveryType;
  if (values.difficulty) out.difficulty = values.difficulty;
  if (values.ageBand) out.ageBand = values.ageBand;
  if (values.category) out.category = values.category;
  if (values.listed) out.listed = values.listed;
  if (values.sort) out.sort = values.sort;
  if (values.page && values.page > 1) out.page = String(values.page);
  return out;
}

/** Convert UI filter values to the typed API query. */
export function filtersToQuery(values: CourseFilterValues): AdminCourseListQuery {
  return {
    q: values.q || undefined,
    status: values.status || undefined,
    deliveryType: values.deliveryType || undefined,
    difficulty: values.difficulty || undefined,
    ageBand: values.ageBand || undefined,
    category: values.category || undefined,
    isListed: values.listed === 'listed' ? true : values.listed === 'unlisted' ? false : undefined,
    sort: values.sort || undefined,
    page: values.page && values.page > 1 ? values.page : undefined,
  };
}

/** True when any narrowing filter is active (sort and page are not narrowing). */
export function hasActiveFilters(values: CourseFilterValues): boolean {
  return Boolean(
    values.q ||
      values.status ||
      values.deliveryType ||
      values.difficulty ||
      values.ageBand ||
      values.category ||
      values.listed,
  );
}

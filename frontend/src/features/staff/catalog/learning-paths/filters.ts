import type { AdminLearningPathListQuery } from '@/lib/api/admin/learning-paths';
import {
  AGE_BAND_VALUES,
  LISTED_VALUES,
  SORT_VALUES,
  STATUS_VALUES,
  type ListedFilter,
} from '../courses/filters';

/**
 * Learning-path-list filter model. The single source of truth is the URL query
 * string; this module converts between `URLSearchParams`, the UI's
 * `LearningPathFilterValues`, and the `AdminLearningPathListQuery` the API
 * expects. The status/age-band/listed/sort enums are shared with the courses
 * list (the backend uses the same `CoursePublishState` / `AgeBand` and the same
 * sort tokens), so they are imported rather than re-declared.
 */

export { AGE_BAND_VALUES, LISTED_VALUES, SORT_VALUES, STATUS_VALUES, type ListedFilter };

export interface LearningPathFilterValues {
  q?: string;
  status?: string;
  ageBand?: string;
  listed?: ListedFilter;
  sort?: string;
  page?: number;
}

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

/** Read filter values from the URL query string. Invalid values are dropped. */
export function parseFilters(params: URLSearchParams): LearningPathFilterValues {
  const q = params.get('q')?.trim();
  const pageRaw = Number.parseInt(params.get('page') ?? '', 10);
  return {
    q: q ? q : undefined,
    status: pick(params.get('status'), STATUS_VALUES),
    ageBand: pick(params.get('ageBand'), AGE_BAND_VALUES),
    listed: pick(params.get('listed'), LISTED_VALUES),
    sort: pick(params.get('sort'), SORT_VALUES),
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : undefined,
  };
}

/** Serialise filter values to a plain record for `setSearchParams` (omits empties). */
export function buildSearchParams(values: LearningPathFilterValues): Record<string, string> {
  const out: Record<string, string> = {};
  if (values.q) out.q = values.q;
  if (values.status) out.status = values.status;
  if (values.ageBand) out.ageBand = values.ageBand;
  if (values.listed) out.listed = values.listed;
  if (values.sort) out.sort = values.sort;
  if (values.page && values.page > 1) out.page = String(values.page);
  return out;
}

/** Convert UI filter values to the typed API query. */
export function filtersToQuery(values: LearningPathFilterValues): AdminLearningPathListQuery {
  return {
    q: values.q || undefined,
    status: values.status || undefined,
    ageBand: values.ageBand || undefined,
    isListed: values.listed === 'listed' ? true : values.listed === 'unlisted' ? false : undefined,
    sort: values.sort || undefined,
    page: values.page && values.page > 1 ? values.page : undefined,
  };
}

/** True when any narrowing filter is active (sort and page are not narrowing). */
export function hasActiveFilters(values: LearningPathFilterValues): boolean {
  return Boolean(values.q || values.status || values.ageBand || values.listed);
}

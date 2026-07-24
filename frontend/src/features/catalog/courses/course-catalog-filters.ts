import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CatalogCoursesQuery } from '@/lib/api/catalog';

/**
 * URL-bound filters for the public courses browse page. Only the query params
 * the catalog API actually supports are exposed: search (`q`), a category
 * `slug`, `ageBand`, `sort` (title | recent-default), and `page`. Values live in
 * the URL so results are shareable and survive reloads.
 */

export const COURSE_SORTS = ['recent', 'title'] as const;
export type CourseSort = (typeof COURSE_SORTS)[number];

export interface CourseCatalogFilterValues {
  q: string;
  category: string;
  ageBand: string;
  sort: CourseSort;
  page: number;
}

const EMPTY: CourseCatalogFilterValues = {
  q: '',
  category: '',
  ageBand: '',
  sort: 'recent',
  page: 1,
};

function parse(params: URLSearchParams): CourseCatalogFilterValues {
  const sortRaw = params.get('sort') ?? '';
  const pageRaw = Number.parseInt(params.get('page') ?? '', 10);
  return {
    q: params.get('q')?.trim() ?? '',
    category: params.get('category')?.trim() ?? '',
    ageBand: params.get('ageBand')?.trim() ?? '',
    sort: (COURSE_SORTS as readonly string[]).includes(sortRaw)
      ? (sortRaw as CourseSort)
      : 'recent',
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : 1,
  };
}

function build(values: CourseCatalogFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  if (values.q) params.set('q', values.q);
  if (values.category) params.set('category', values.category);
  if (values.ageBand) params.set('ageBand', values.ageBand);
  if (values.sort && values.sort !== 'recent') params.set('sort', values.sort);
  if (values.page > 1) params.set('page', String(values.page));
  return params;
}

/** The API query — `sort: 'recent'` is the backend default, so it is omitted. */
export function filtersToQuery(values: CourseCatalogFilterValues): CatalogCoursesQuery {
  return {
    q: values.q || undefined,
    category: values.category || undefined,
    ageBand: values.ageBand || undefined,
    sort: values.sort === 'title' ? 'title' : undefined,
    page: values.page > 1 ? values.page : undefined,
  };
}

export function hasActiveCourseFilters(values: CourseCatalogFilterValues): boolean {
  return Boolean(values.q || values.category || values.ageBand);
}

export interface CourseCatalogFilterController {
  values: CourseCatalogFilterValues;
  query: CatalogCoursesQuery;
  hasActiveFilters: boolean;
  page: number;
  setValues: (patch: Partial<CourseCatalogFilterValues>, opts?: { keepPage?: boolean }) => void;
  setPage: (page: number) => void;
  clear: () => void;
}

export function useCourseCatalogFilters(): CourseCatalogFilterController {
  const [searchParams, setSearchParams] = useSearchParams();
  const values = useMemo(() => parse(searchParams), [searchParams]);
  const query = useMemo(() => filtersToQuery(values), [values]);

  const setValues = useCallback<CourseCatalogFilterController['setValues']>(
    (patch, opts) => {
      const next: CourseCatalogFilterValues = { ...values, ...patch };
      if (!opts?.keepPage) next.page = 1;
      setSearchParams(build(next));
    },
    [values, setSearchParams],
  );

  const setPage = useCallback(
    (page: number) => setSearchParams(build({ ...values, page })),
    [values, setSearchParams],
  );

  const clear = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams]);

  return {
    values,
    query,
    hasActiveFilters: hasActiveCourseFilters(values),
    page: values.page,
    setValues,
    setPage,
    clear,
  };
}

export { EMPTY as emptyCourseFilters };

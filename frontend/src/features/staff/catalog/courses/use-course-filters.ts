import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminCourseListQuery } from '@/lib/api/admin/courses';
import {
  buildSearchParams,
  filtersToQuery,
  hasActiveFilters,
  parseFilters,
  type CourseFilterValues,
} from './filters';

export interface CourseFilterController {
  values: CourseFilterValues;
  query: AdminCourseListQuery;
  hasActiveFilters: boolean;
  page: number;
  /** Patch one or more filter values. Resets to page 1 unless `keepPage`. */
  setValues: (patch: Partial<CourseFilterValues>, opts?: { keepPage?: boolean }) => void;
  setPage: (page: number) => void;
  clear: () => void;
}

/**
 * Binds the course-list filters to the URL query string so they survive reloads
 * and are shareable. Returns the parsed values, the typed API query, and setters
 * that write back to the URL.
 */
export function useCourseFilters(): CourseFilterController {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = useMemo(() => filtersToQuery(values), [values]);

  const setValues = useCallback<CourseFilterController['setValues']>(
    (patch, opts) => {
      const next: CourseFilterValues = { ...values, ...patch };
      if (!opts?.keepPage) next.page = 1;
      setSearchParams(buildSearchParams(next));
    },
    [values, setSearchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      setSearchParams(buildSearchParams({ ...values, page }));
    },
    [values, setSearchParams],
  );

  const clear = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return {
    values,
    query,
    hasActiveFilters: hasActiveFilters(values),
    page: values.page ?? 1,
    setValues,
    setPage,
    clear,
  };
}

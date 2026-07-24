import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminCategoryListQuery } from '@/lib/api/admin/categories';
import {
  buildSearchParams,
  filtersToQuery,
  hasActiveFilters,
  parseFilters,
  type CategoryFilterValues,
} from './filters';

export interface CategoryFilterController {
  values: CategoryFilterValues;
  query: AdminCategoryListQuery;
  hasActiveFilters: boolean;
  page: number;
  /** Patch one or more filter values. Resets to page 1 unless `keepPage`. */
  setValues: (patch: Partial<CategoryFilterValues>, opts?: { keepPage?: boolean }) => void;
  setPage: (page: number) => void;
  clear: () => void;
}

/**
 * Binds the category-list filters to the URL query string so they survive
 * reloads and are shareable. Returns the parsed values, the typed API query,
 * and setters that write back to the URL. Mirrors the courses list controller.
 */
export function useCategoryFilters(): CategoryFilterController {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = useMemo(() => filtersToQuery(values), [values]);

  const setValues = useCallback<CategoryFilterController['setValues']>(
    (patch, opts) => {
      const next: CategoryFilterValues = { ...values, ...patch };
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

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AdminLearningPathListQuery } from '@/lib/api/admin/learning-paths';
import {
  buildSearchParams,
  filtersToQuery,
  hasActiveFilters,
  parseFilters,
  type LearningPathFilterValues,
} from './filters';

export interface LearningPathFilterController {
  values: LearningPathFilterValues;
  query: AdminLearningPathListQuery;
  hasActiveFilters: boolean;
  page: number;
  /** Patch one or more filter values. Resets to page 1 unless `keepPage`. */
  setValues: (patch: Partial<LearningPathFilterValues>, opts?: { keepPage?: boolean }) => void;
  setPage: (page: number) => void;
  clear: () => void;
}

/**
 * Binds the learning-path-list filters to the URL query string so they survive
 * reloads and are shareable. Mirrors the courses/categories list controllers.
 */
export function useLearningPathFilters(): LearningPathFilterController {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = useMemo(() => filtersToQuery(values), [values]);

  const setValues = useCallback<LearningPathFilterController['setValues']>(
    (patch, opts) => {
      const next: LearningPathFilterValues = { ...values, ...patch };
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

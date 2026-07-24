import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CatalogPathsQuery } from '@/lib/api/catalog';

/**
 * URL-bound filters for the public learning-paths browse page. The catalog API
 * only supports `ageBand` + `page` for learning paths (no search / category /
 * sort — see Findings), so those are the only controls exposed here.
 */

export interface PathCatalogFilterValues {
  ageBand: string;
  page: number;
}

function parse(params: URLSearchParams): PathCatalogFilterValues {
  const pageRaw = Number.parseInt(params.get('page') ?? '', 10);
  return {
    ageBand: params.get('ageBand')?.trim() ?? '',
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : 1,
  };
}

function build(values: PathCatalogFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  if (values.ageBand) params.set('ageBand', values.ageBand);
  if (values.page > 1) params.set('page', String(values.page));
  return params;
}

export function filtersToQuery(values: PathCatalogFilterValues): CatalogPathsQuery {
  return {
    ageBand: values.ageBand || undefined,
    page: values.page > 1 ? values.page : undefined,
  };
}

export interface PathCatalogFilterController {
  values: PathCatalogFilterValues;
  query: CatalogPathsQuery;
  hasActiveFilters: boolean;
  page: number;
  setValues: (patch: Partial<PathCatalogFilterValues>, opts?: { keepPage?: boolean }) => void;
  setPage: (page: number) => void;
  clear: () => void;
}

export function usePathCatalogFilters(): PathCatalogFilterController {
  const [searchParams, setSearchParams] = useSearchParams();
  const values = useMemo(() => parse(searchParams), [searchParams]);
  const query = useMemo(() => filtersToQuery(values), [values]);

  const setValues = useCallback<PathCatalogFilterController['setValues']>(
    (patch, opts) => {
      const next: PathCatalogFilterValues = { ...values, ...patch };
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
    hasActiveFilters: Boolean(values.ageBand),
    page: values.page,
    setValues,
    setPage,
    clear,
  };
}

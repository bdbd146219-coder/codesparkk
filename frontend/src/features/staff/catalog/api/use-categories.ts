import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as categoriesApi from '@/lib/api/admin/categories';
import { categoryKeys } from './query-keys';

/**
 * React Query hooks for the admin category API. Same strategy as the course
 * hooks: no optimistic updates, seed the detail cache from full-detail
 * responses, invalidate lists after writes.
 */

export function useAdminCategories(query?: categoriesApi.AdminCategoryListQuery) {
  return useQuery({
    queryKey: categoryKeys.list(query),
    queryFn: ({ signal }) => categoriesApi.listAdminCategories(query, { signal }),
  });
}

export function useAdminCategory(id: string | undefined) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: ({ signal }) => categoriesApi.getAdminCategory(id as string, { signal }),
    enabled: Boolean(id),
  });
}

/** A mutation whose response is the full category detail → seed the detail cache. */
function useCategoryDetailMutation<V extends { id: string }>(
  mutationFn: (vars: V) => Promise<categoriesApi.AdminCategoryDetail>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      queryClient.setQueryData(categoryKeys.detail(vars.id), data);
      void queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: categoriesApi.CreateCategoryBody) => categoriesApi.createAdminCategory(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
}

export function useUpdateCategory() {
  return useCategoryDetailMutation(
    ({ id, body }: { id: string; body: categoriesApi.UpdateCategoryBody }) =>
      categoriesApi.updateAdminCategory(id, body),
  );
}

export function useActivateCategory() {
  return useCategoryDetailMutation(
    ({ id, body }: { id: string; body: categoriesApi.CategoryLifecycleBody }) =>
      categoriesApi.activateCategory(id, body),
  );
}

export function useDeactivateCategory() {
  return useCategoryDetailMutation(
    ({ id, body }: { id: string; body: categoriesApi.CategoryLifecycleBody }) =>
      categoriesApi.deactivateCategory(id, body),
  );
}

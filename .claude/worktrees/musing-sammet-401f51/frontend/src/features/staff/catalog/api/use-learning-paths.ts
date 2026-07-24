import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pathsApi from '@/lib/api/admin/learning-paths';
import { learningPathKeys } from './query-keys';

/**
 * React Query hooks for the admin learning-path API. Same strategy as the
 * course hooks: no optimistic updates, seed the detail cache from full-detail
 * responses (update / items), invalidate detail + lists on lifecycle.
 */

export function useAdminLearningPaths(query?: pathsApi.AdminLearningPathListQuery) {
  return useQuery({
    queryKey: learningPathKeys.list(query),
    queryFn: ({ signal }) => pathsApi.listAdminLearningPaths(query, { signal }),
  });
}

export function useAdminLearningPath(id: string | undefined) {
  return useQuery({
    queryKey: learningPathKeys.detail(id),
    queryFn: ({ signal }) => pathsApi.getAdminLearningPath(id as string, { signal }),
    enabled: Boolean(id),
  });
}

/** A mutation whose response is the full path detail → seed the detail cache. */
function usePathDetailMutation<V extends { id: string }>(
  mutationFn: (vars: V) => Promise<pathsApi.AdminLearningPathDetail>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      queryClient.setQueryData(learningPathKeys.detail(vars.id), data);
      void queryClient.invalidateQueries({ queryKey: learningPathKeys.lists() });
    },
  });
}

/** A lifecycle mutation whose response is partial → invalidate detail + lists. */
function usePathLifecycle(
  mutationFn: (id: string, body: pathsApi.LearningPathLifecycleBody) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: pathsApi.LearningPathLifecycleBody }) =>
      mutationFn(id, body),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: learningPathKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: learningPathKeys.lists() });
    },
  });
}

export function useCreateLearningPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: pathsApi.CreateLearningPathBody) => pathsApi.createAdminLearningPath(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningPathKeys.lists() });
    },
  });
}

export function useUpdateLearningPath() {
  return usePathDetailMutation(
    ({ id, body }: { id: string; body: pathsApi.UpdateLearningPathBody }) =>
      pathsApi.updateAdminLearningPath(id, body),
  );
}

export function usePublishLearningPath() {
  return usePathLifecycle(pathsApi.publishLearningPath);
}

export function useUnpublishLearningPath() {
  return usePathLifecycle(pathsApi.unpublishLearningPath);
}

export function useArchiveLearningPath() {
  return usePathLifecycle(pathsApi.archiveLearningPath);
}

export function useRestoreLearningPath() {
  return usePathLifecycle(pathsApi.restoreLearningPath);
}

export function useAddLearningPathItem() {
  return usePathDetailMutation(
    ({ id, body }: { id: string; body: pathsApi.AddLearningPathItemBody }) =>
      pathsApi.addLearningPathItem(id, body),
  );
}

export function useRemoveLearningPathItem() {
  return usePathDetailMutation(
    ({
      id,
      itemId,
      body,
    }: {
      id: string;
      itemId: string;
      body: pathsApi.RemoveLearningPathItemBody;
    }) => pathsApi.removeLearningPathItem(id, itemId, body),
  );
}

export function useReorderLearningPathItems() {
  return usePathDetailMutation(
    ({ id, body }: { id: string; body: pathsApi.ReorderLearningPathItemsBody }) =>
      pathsApi.reorderLearningPathItems(id, body),
  );
}

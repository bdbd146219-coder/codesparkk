import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as coursesApi from '@/lib/api/admin/courses';
import { courseKeys } from './query-keys';

/**
 * React Query hooks for the admin course API. Thin wrappers over the typed
 * functions in `@/lib/api/admin/courses`.
 *
 * Mutation strategy (see docs/frontend-architecture.md):
 *   - No optimistic updates — server is the source of truth.
 *   - `retry: 0` for mutations (set on the shared QueryClient).
 *   - Full-detail responses (update / modules / instructors) seed the detail
 *     cache directly; partial responses (create / lifecycle) invalidate instead.
 *   - List keys are invalidated after every write.
 *   - 409 / 422 are surfaced to the UI as `ApiError`; never auto-retried.
 */

export function useAdminCourses(query?: coursesApi.AdminCourseListQuery) {
  return useQuery({
    queryKey: courseKeys.list(query),
    queryFn: ({ signal }) => coursesApi.listAdminCourses(query, { signal }),
  });
}

export function useAdminCourse(id: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: ({ signal }) => coursesApi.getAdminCourse(id as string, { signal }),
    enabled: Boolean(id),
  });
}

// --- Shared mutation shapes -------------------------------------------------

/** A mutation whose response is the full course detail → seed the detail cache. */
function useCourseDetailMutation<V extends { id: string }>(
  mutationFn: (vars: V) => Promise<coursesApi.AdminCourseDetail>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      queryClient.setQueryData(courseKeys.detail(vars.id), data);
      void queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

/** A lifecycle mutation whose response is partial → invalidate detail + lists. */
function useCourseLifecycle(
  mutationFn: (id: string, body: coursesApi.CourseLifecycleBody) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: coursesApi.CourseLifecycleBody }) =>
      mutationFn(id, body),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

// --- Mutations --------------------------------------------------------------

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: coursesApi.CreateCourseBody) => coursesApi.createAdminCourse(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

export function useUpdateCourse() {
  return useCourseDetailMutation(
    ({ id, body }: { id: string; body: coursesApi.UpdateCourseBody }) =>
      coursesApi.updateAdminCourse(id, body),
  );
}

export function usePublishCourse() {
  return useCourseLifecycle(coursesApi.publishCourse);
}

export function useUnpublishCourse() {
  return useCourseLifecycle(coursesApi.unpublishCourse);
}

export function useArchiveCourse() {
  return useCourseLifecycle(coursesApi.archiveCourse);
}

export function useRestoreCourse() {
  return useCourseLifecycle(coursesApi.restoreCourse);
}

export function useAddCourseModule() {
  return useCourseDetailMutation(
    ({ id, body }: { id: string; body: coursesApi.AddCourseModuleBody }) =>
      coursesApi.addCourseModule(id, body),
  );
}

export function useUpdateCourseModule() {
  return useCourseDetailMutation(
    ({
      id,
      moduleId,
      body,
    }: {
      id: string;
      moduleId: string;
      body: coursesApi.UpdateCourseModuleBody;
    }) => coursesApi.updateCourseModule(id, moduleId, body),
  );
}

export function useRemoveCourseModule() {
  return useCourseDetailMutation(
    ({
      id,
      moduleId,
      body,
    }: {
      id: string;
      moduleId: string;
      body: coursesApi.RemoveCourseModuleBody;
    }) => coursesApi.removeCourseModule(id, moduleId, body),
  );
}

export function useReorderCourseModules() {
  return useCourseDetailMutation(
    ({ id, body }: { id: string; body: coursesApi.ReorderCourseModulesBody }) =>
      coursesApi.reorderCourseModules(id, body),
  );
}

export function useAssignCourseInstructor() {
  return useCourseDetailMutation(
    ({ id, body }: { id: string; body: coursesApi.AssignCourseInstructorBody }) =>
      coursesApi.assignCourseInstructor(id, body),
  );
}

export function useRemoveCourseInstructor() {
  return useCourseDetailMutation(
    ({
      id,
      instructorUserId,
      body,
    }: {
      id: string;
      instructorUserId: string;
      body: coursesApi.RemoveCourseInstructorBody;
    }) => coursesApi.removeCourseInstructor(id, instructorUserId, body),
  );
}

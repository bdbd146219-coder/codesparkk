import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as interestsApi from '@/lib/api/admin/interests';

/** React Query hooks for the admin interest-lead review surface (C4N). */

const leadKeys = {
  all: ['admin', 'interest-leads'] as const,
  list: (query?: interestsApi.AdminInterestListQuery) =>
    [...leadKeys.all, 'list', query ?? {}] as const,
};

export function useAdminInterestLeads(query?: interestsApi.AdminInterestListQuery) {
  return useQuery({
    queryKey: leadKeys.list(query),
    queryFn: ({ signal }) => interestsApi.listAdminInterestLeads(query, { signal }),
  });
}

export function useUpdateInterestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string;
      status: interestsApi.CatalogInterestStatus;
      adminNotes?: string;
    }) => interestsApi.updateInterestStatus(id, status, adminNotes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook } from '@testing-library/react';
import { ApiError } from '@/lib/api/errors';
import { courseKeys } from '../query-keys';
import { useCreateCourse, usePublishCourse, useUpdateCourse } from '../use-courses';

// Auto-mock the typed API module so the hooks exercise their cache logic
// without any network. Behaviour is representative of all three hook families,
// which share the same detail/lifecycle/create helpers.
vi.mock('@/lib/api/admin/courses');
import * as coursesApi from '@/lib/api/admin/courses';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('useCreateCourse', () => {
  it('invalidates course lists on success', async () => {
    const client = makeClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(coursesApi.createAdminCourse).mockResolvedValue({ id: 'c1', slug: 's' });

    const { result } = renderHook(() => useCreateCourse(), { wrapper: wrapperFor(client) });
    await result.current.mutateAsync(undefined as never);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: courseKeys.lists() });
  });
});

describe('useUpdateCourse', () => {
  it('seeds the detail cache from the full-detail response and invalidates lists', async () => {
    const client = makeClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const detail = { id: 'c1', title: { en: 'X' } };
    vi.mocked(coursesApi.updateAdminCourse).mockResolvedValue(detail as never);

    const { result } = renderHook(() => useUpdateCourse(), { wrapper: wrapperFor(client) });
    await result.current.mutateAsync({ id: 'c1', body: undefined as never });

    expect(client.getQueryData(courseKeys.detail('c1'))).toEqual(detail);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: courseKeys.lists() });
  });
});

describe('usePublishCourse', () => {
  it('does not touch the cache when the server returns a 409 conflict', async () => {
    const client = makeClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.mocked(coursesApi.publishCourse).mockRejectedValue(
      new ApiError(409, 'x', 'y', undefined, undefined, { currentRowVersion: 'RV' }),
    );

    const { result } = renderHook(() => usePublishCourse(), { wrapper: wrapperFor(client) });
    await expect(
      result.current.mutateAsync({ id: 'c1', body: { rowVersion: 'stale' } as never }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(invalidate).not.toHaveBeenCalled();
    expect(client.getQueryData(courseKeys.detail('c1'))).toBeUndefined();
  });
});

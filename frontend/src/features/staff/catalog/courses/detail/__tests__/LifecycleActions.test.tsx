import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import { LifecycleActions } from '../LifecycleActions';
import type { AdminCourseDetail } from '../detail-helpers';

vi.mock('@/lib/api/admin/courses');
import * as coursesApi from '@/lib/api/admin/courses';

function course(overrides: Partial<AdminCourseDetail> = {}): AdminCourseDetail {
  return {
    id: 'c1',
    slug: 'python-adventures',
    titleEn: 'Python Adventures',
    titleAr: 'مغامرات بايثون',
    publishState: 'Draft',
    isListed: false,
    deliveryType: 'Hybrid',
    difficulty: 'Intermediate',
    ageBand: 'Explorer',
    outcomes: [],
    modules: [],
    instructors: [],
    publishReadiness: { isReady: true, items: [] },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    rowVersion: 'RV1',
    ...overrides,
  } as AdminCourseDetail;
}

const lifecycleResult = { id: 'c1', publishState: 'Published', rowVersion: 'RV2' };

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderPanel(c: AdminCourseDetail, onReloadLatest = vi.fn()) {
  render(<LifecycleActions course={c} onReloadLatest={onReloadLatest} />, { wrapper: Wrapper });
  return { onReloadLatest };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LifecycleActions', () => {
  it('shows an enabled Publish action plus Archive for a ready Draft', () => {
    renderPanel(course());
    expect(screen.getByRole('button', { name: 'Publish' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).toBeNull();
  });

  it('disables Publish and explains why for a not-ready Draft', () => {
    renderPanel(
      course({
        publishReadiness: {
          isReady: false,
          items: [{ code: 'thumbnail-missing', messageKey: 'courses.readiness.thumbnailMissing' }],
        },
      }),
    );
    expect(screen.getByRole('button', { name: 'Publish' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/resolve the requirements above/i)).toBeTruthy();
  });

  it('shows Unpublish and Archive for a Published course', () => {
    renderPanel(course({ publishState: 'Published', isListed: true }));
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('shows Restore for an Archived course', () => {
    renderPanel(course({ publishState: 'Archived' }));
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
  });

  it('confirms a publish: calls publishCourse with the rowVersion and shows success', async () => {
    vi.mocked(coursesApi.publishCourse).mockResolvedValue(lifecycleResult as never);
    renderPanel(course());

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish course' }));

    await waitFor(() => expect(coursesApi.publishCourse).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(coursesApi.publishCourse).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(body.rowVersion).toBe('RV1');
    await waitFor(() => expect(screen.getByText(/course published/i)).toBeTruthy());
  });

  it('renders the readiness checklist on a 422 publish-blocked response', async () => {
    vi.mocked(coursesApi.publishCourse).mockRejectedValue(
      new ApiError(422, 'x', 'k', undefined, undefined, {
        readiness: {
          isReady: false,
          items: [
            {
              code: 'thumbnail-missing',
              messageKey: 'courses.readiness.thumbnailMissing',
              message: 'A thumbnail is required.',
            },
          ],
        },
      }),
    );
    renderPanel(course());

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish course' }));

    await waitFor(() => expect(screen.getByText(/publish blocked/i)).toBeTruthy());
    expect(screen.getByText(/thumbnail/i)).toBeTruthy();
  });

  it('renders the concurrency alert on a 409 conflict and offers reload', async () => {
    vi.mocked(coursesApi.archiveCourse).mockRejectedValue(
      new ApiError(409, 'x', 'k', undefined, undefined, { currentRowVersion: 'RV2' }),
    );
    const { onReloadLatest } = renderPanel(course({ publishState: 'Published' }));

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive course' }));

    await waitFor(() => expect(screen.getByText(/changed since you opened it/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /reload latest/i }));
    expect(onReloadLatest).toHaveBeenCalledTimes(1);
  });

  it('confirms an archive by calling archiveCourse', async () => {
    vi.mocked(coursesApi.archiveCourse).mockResolvedValue(lifecycleResult as never);
    renderPanel(course({ publishState: 'Published' }));

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive course' }));

    await waitFor(() => expect(coursesApi.archiveCourse).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/course archived/i)).toBeTruthy());
  });

  it('confirms a restore by calling restoreCourse', async () => {
    vi.mocked(coursesApi.restoreCourse).mockResolvedValue(lifecycleResult as never);
    renderPanel(course({ publishState: 'Archived' }));

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore course' }));

    await waitFor(() => expect(coursesApi.restoreCourse).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/course restored/i)).toBeTruthy());
  });

  it('does not call the mutation when the dialog is cancelled', async () => {
    renderPanel(course());

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByText('Publish this course?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Publish this course?')).toBeNull());
    expect(coursesApi.publishCourse).not.toHaveBeenCalled();
  });
});

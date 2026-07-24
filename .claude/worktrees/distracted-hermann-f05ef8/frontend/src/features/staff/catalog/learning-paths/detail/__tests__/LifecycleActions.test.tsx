import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathDetail } from '@/lib/api/admin/learning-paths';
import { LifecycleActions } from '../LifecycleActions';

vi.mock('@/lib/api/admin/learning-paths');
import * as pathsApi from '@/lib/api/admin/learning-paths';

function path(overrides: Partial<AdminLearningPathDetail> = {}): AdminLearningPathDetail {
  return {
    id: 'p1',
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    summaryEn: 'A guided path.',
    summaryAr: 'مسار موجّه.',
    ageBand: 'Junior',
    publishState: 'Draft',
    isListed: false,
    media: { thumbnailKey: null, thumbnailAlt: null, heroKey: null, promoVideoUrl: null },
    items: [],
    readiness: { isReady: true, items: [] },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    publishedAt: null,
    archivedAt: null,
    deletedAt: null,
    rowVersion: 'RV1',
    ...overrides,
  } as AdminLearningPathDetail;
}

const lifecycleResult = { id: 'p1', publishState: 'Published', isListed: false, rowVersion: 'RV2' };

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderPanel(p: AdminLearningPathDetail, onReloadLatest = vi.fn()) {
  render(<LifecycleActions path={p} onReloadLatest={onReloadLatest} />, { wrapper: Wrapper });
  return { onReloadLatest };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LifecycleActions (learning paths)', () => {
  it('shows an enabled Publish action plus Archive for a ready Draft', () => {
    renderPanel(path());
    expect(screen.getByRole('button', { name: 'Publish' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).toBeNull();
  });

  it('disables Publish and explains why for a not-ready Draft', () => {
    renderPanel(
      path({
        readiness: {
          isReady: false,
          items: [
            {
              code: 'no-published-course',
              messageKey: 'learningPaths.readiness.noPublishedCourse',
            },
          ],
        },
      }),
    );
    expect(screen.getByRole('button', { name: 'Publish' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/resolve the requirements above/i)).toBeTruthy();
  });

  it('shows Unpublish and Archive for a Published path', () => {
    renderPanel(path({ publishState: 'Published', isListed: true }));
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('shows Restore for an Archived path', () => {
    renderPanel(path({ publishState: 'Archived' }));
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
  });

  it('confirms a publish: calls publishLearningPath with the rowVersion and shows success', async () => {
    vi.mocked(pathsApi.publishLearningPath).mockResolvedValue(lifecycleResult as never);
    renderPanel(path());

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish learning path' }));

    await waitFor(() => expect(pathsApi.publishLearningPath).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(pathsApi.publishLearningPath).mock.calls[0]!;
    expect(id).toBe('p1');
    expect(body.rowVersion).toBe('RV1');
    await waitFor(() => expect(screen.getByText(/learning path published/i)).toBeTruthy());
  });

  it('renders the publish-blocked alert on a 422 readiness response', async () => {
    vi.mocked(pathsApi.publishLearningPath).mockRejectedValue(
      new ApiError(422, 'x', 'k', undefined, undefined, {
        readiness: {
          isReady: false,
          items: [
            {
              code: 'no-published-course',
              messageKey: 'learningPaths.readiness.noPublishedCourse',
              message: 'Add at least one published course to this learning path.',
            },
          ],
        },
      }),
    );
    renderPanel(path());

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish learning path' }));

    await waitFor(() => expect(screen.getByText(/publish blocked/i)).toBeTruthy());
    expect(screen.getByText(/at least one published course/i)).toBeTruthy();
  });

  it('renders the concurrency alert on a 409 conflict and offers reload', async () => {
    vi.mocked(pathsApi.archiveLearningPath).mockRejectedValue(
      new ApiError(409, 'x', 'k', undefined, undefined, { currentRowVersion: 'RV2' }),
    );
    const { onReloadLatest } = renderPanel(path({ publishState: 'Published' }));

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive learning path' }));

    await waitFor(() => expect(screen.getByText(/changed since you opened it/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /reload latest/i }));
    expect(onReloadLatest).toHaveBeenCalledTimes(1);
  });

  it('confirms an archive by calling archiveLearningPath', async () => {
    vi.mocked(pathsApi.archiveLearningPath).mockResolvedValue(lifecycleResult as never);
    renderPanel(path({ publishState: 'Published' }));

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive learning path' }));

    await waitFor(() => expect(pathsApi.archiveLearningPath).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/learning path archived/i)).toBeTruthy());
  });

  it('confirms an unpublish by calling unpublishLearningPath', async () => {
    vi.mocked(pathsApi.unpublishLearningPath).mockResolvedValue(lifecycleResult as never);
    renderPanel(path({ publishState: 'Published' }));

    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish learning path' }));

    await waitFor(() => expect(pathsApi.unpublishLearningPath).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/learning path unpublished/i)).toBeTruthy());
  });

  it('confirms a restore by calling restoreLearningPath', async () => {
    vi.mocked(pathsApi.restoreLearningPath).mockResolvedValue(lifecycleResult as never);
    renderPanel(path({ publishState: 'Archived' }));

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore learning path' }));

    await waitFor(() => expect(pathsApi.restoreLearningPath).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/learning path restored/i)).toBeTruthy());
  });

  it('does not call the mutation when the dialog is cancelled', async () => {
    renderPanel(path());

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByText('Publish this learning path?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Publish this learning path?')).toBeNull());
    expect(pathsApi.publishLearningPath).not.toHaveBeenCalled();
  });
});

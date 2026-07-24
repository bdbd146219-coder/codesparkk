import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathDetail } from '@/lib/api/admin/learning-paths';
import { LearningPathItemsManager } from '../LearningPathItemsManager';

vi.mock('@/lib/api/admin/learning-paths');
import * as pathsApi from '@/lib/api/admin/learning-paths';

const UUID = '00000000-0000-0000-0000-000000000009';

function path(overrides: Partial<AdminLearningPathDetail> = {}): AdminLearningPathDetail {
  return {
    id: 'p1',
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    summaryEn: '',
    summaryAr: '',
    ageBand: 'Junior',
    publishState: 'Draft',
    isListed: false,
    media: { thumbnailKey: null, thumbnailAlt: null, heroKey: null, promoVideoUrl: null },
    items: [
      {
        id: 'm1',
        courseId: 'c1',
        order: 1,
        note: null,
        courseSlug: 'intro-to-scratch',
        courseTitleEn: 'Intro to Scratch',
        coursePublishState: 'Published',
      },
      {
        id: 'm2',
        courseId: 'c2',
        order: 2,
        note: null,
        courseSlug: 'python-adventures',
        courseTitleEn: 'Python Adventures',
        coursePublishState: 'Published',
      },
    ],
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

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderManager(p = path(), onReload = vi.fn()) {
  render(<LearningPathItemsManager path={p} onReloadLatest={onReload} />, { wrapper: Wrapper });
  return { onReload };
}

async function openAddDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Add course' }));
  return within(screen.getByRole('dialog'));
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LearningPathItemsManager', () => {
  it('renders the item list with a heading and an add action', () => {
    renderManager();
    expect(screen.getByRole('heading', { name: /courses in this path/i })).toBeTruthy();
    expect(screen.getByText('Intro to Scratch')).toBeTruthy();
    expect(screen.getByText('Python Adventures')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add course' })).toBeTruthy();
  });

  it('renders the empty state when there are no items', () => {
    renderManager(path({ items: [] }));
    expect(screen.getByText(/no courses in this learning path yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add course' })).toBeTruthy();
  });

  it('adds a course with the courseId, note, and rowVersion', async () => {
    vi.mocked(pathsApi.addLearningPathItem).mockResolvedValue(path());
    renderManager();

    const dialog = await openAddDialog();
    fireEvent.change(dialog.getByLabelText(/course id/i), { target: { value: UUID } });
    fireEvent.change(dialog.getByLabelText('Note'), { target: { value: 'Start here' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Add course' }));

    await waitFor(() => expect(pathsApi.addLearningPathItem).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(pathsApi.addLearningPathItem).mock.calls[0]!;
    expect(id).toBe('p1');
    expect(body.courseId).toBe(UUID);
    expect(body.note).toBe('Start here');
    expect(body.rowVersion).toBe('RV1');
    await waitFor(() => expect(screen.getByText(/course added/i)).toBeTruthy());
  });

  it('blocks an empty courseId client-side', async () => {
    renderManager();
    const dialog = await openAddDialog();
    // Make the form dirty via the note, leave the required courseId empty.
    fireEvent.change(dialog.getByLabelText('Note'), { target: { value: 'note' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Add course' }));

    await waitFor(() => expect(screen.getByText(/a course id is required/i)).toBeTruthy());
    expect(pathsApi.addLearningPathItem).not.toHaveBeenCalled();
  });

  it('maps a 409 duplicate to a clear summary', async () => {
    vi.mocked(pathsApi.addLearningPathItem).mockRejectedValue(new ApiError(409, 'x', 'k'));
    renderManager();
    const dialog = await openAddDialog();
    fireEvent.change(dialog.getByLabelText(/course id/i), { target: { value: UUID } });
    fireEvent.click(dialog.getByRole('button', { name: 'Add course' }));

    await waitFor(() =>
      expect(screen.getByText(/this course is already in the learning path/i)).toBeTruthy(),
    );
  });

  it('maps a 404 course-not-found to a clear summary', async () => {
    vi.mocked(pathsApi.addLearningPathItem).mockRejectedValue(new ApiError(404, 'x', 'k'));
    renderManager();
    const dialog = await openAddDialog();
    fireEvent.change(dialog.getByLabelText(/course id/i), { target: { value: UUID } });
    fireEvent.click(dialog.getByRole('button', { name: 'Add course' }));

    await waitFor(() => expect(screen.getByText(/no course was found with this id/i)).toBeTruthy());
  });

  it('does not remove when the confirmation is cancelled', async () => {
    renderManager();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    expect(screen.getByText(/remove this course\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/remove this course\?/i)).toBeNull());
    expect(pathsApi.removeLearningPathItem).not.toHaveBeenCalled();
  });

  it('confirms removal by calling removeLearningPathItem', async () => {
    vi.mocked(pathsApi.removeLearningPathItem).mockResolvedValue(path());
    renderManager();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Remove course' }));

    await waitFor(() => expect(pathsApi.removeLearningPathItem).toHaveBeenCalledTimes(1));
    const [id, itemId, body] = vi.mocked(pathsApi.removeLearningPathItem).mock.calls[0]!;
    expect(id).toBe('p1');
    expect(itemId).toBe('m1');
    expect(body.rowVersion).toBe('RV1');
  });

  it('reorders by building the new ordered item ids', async () => {
    vi.mocked(pathsApi.reorderLearningPathItems).mockResolvedValue(path());
    renderManager();
    fireEvent.click(screen.getAllByRole('button', { name: 'Move course down' })[0]!);

    await waitFor(() => expect(pathsApi.reorderLearningPathItems).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(pathsApi.reorderLearningPathItems).mock.calls[0]!;
    expect(id).toBe('p1');
    expect(body.orderedItemIds).toEqual(['m2', 'm1']);
  });

  it('disables move-up on the first item and move-down on the last', () => {
    renderManager();
    const up = screen.getAllByRole('button', { name: 'Move course up' });
    const down = screen.getAllByRole('button', { name: 'Move course down' });
    expect(up[0]!.hasAttribute('disabled')).toBe(true);
    expect(down[down.length - 1]!.hasAttribute('disabled')).toBe(true);
  });

  it('shows the concurrency alert on a 409 reorder conflict', async () => {
    vi.mocked(pathsApi.reorderLearningPathItems).mockRejectedValue(
      new ApiError(409, 'x', 'k', undefined, undefined, { currentRowVersion: 'RV2' }),
    );
    const { onReload } = renderManager();
    fireEvent.click(screen.getAllByRole('button', { name: 'Move course down' })[0]!);

    await waitFor(() => expect(screen.getByText(/changed since you opened it/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /reload latest/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('is read-only for an archived path (no add control, disabled reorder + remove)', () => {
    // The editor shows the single global archived notice; the Items tab itself
    // just locks its controls (parity with the course Modules tab).
    renderManager(path({ publishState: 'Archived' }));
    expect(screen.queryByRole('button', { name: 'Add course' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Remove' })[0]!.hasAttribute('disabled')).toBe(
      true,
    );
    // Every reorder control is locked while archived.
    for (const btn of screen.getAllByRole('button', { name: 'Move course down' })) {
      expect(btn.hasAttribute('disabled')).toBe(true);
    }
  });
});

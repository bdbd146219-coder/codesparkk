import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import { ModulesManager } from '../ModulesManager';
import type { AdminCourseDetail } from '../detail-helpers';

vi.mock('@/lib/api/admin/courses');
import * as coursesApi from '@/lib/api/admin/courses';

function course(overrides: Partial<AdminCourseDetail> = {}): AdminCourseDetail {
  return {
    id: 'c1',
    slug: 'python-adventures',
    titleEn: 'Python Adventures',
    publishState: 'Published',
    isListed: true,
    deliveryType: 'Hybrid',
    difficulty: 'Intermediate',
    ageBand: 'Explorer',
    outcomes: [],
    instructors: [],
    publishReadiness: { isReady: true, items: [] },
    modules: [
      { id: 'm1', titleEn: 'Getting started', titleAr: 'البداية', summaryEn: 'Setup', order: 1 },
      { id: 'm2', titleEn: 'Loops and logic', titleAr: 'الحلقات', order: 2 },
    ],
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    rowVersion: 'RV1',
    ...overrides,
  } as AdminCourseDetail;
}

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderManager(c: AdminCourseDetail, onReloadLatest = vi.fn()) {
  render(<ModulesManager course={c} lang="en" onReloadLatest={onReloadLatest} />, {
    wrapper: Wrapper,
  });
  return { onReloadLatest };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ModulesManager', () => {
  it('renders the module list with a heading and add action', () => {
    renderManager(course());
    expect(screen.getByRole('heading', { name: /course modules/i })).toBeTruthy();
    expect(screen.getByText('Getting started')).toBeTruthy();
    expect(screen.getByText('Loops and logic')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add module' })).toBeTruthy();
  });

  it('renders the empty state when there are no modules', () => {
    renderManager(course({ modules: [] }));
    expect(screen.getByText(/no modules yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add module' })).toBeTruthy();
  });

  it('opens the add dialog and submits a new module with the rowVersion', async () => {
    vi.mocked(coursesApi.addCourseModule).mockResolvedValue(course() as never);
    renderManager(course());

    fireEvent.click(screen.getByRole('button', { name: 'Add module' }));
    expect(screen.getByText('Add module', { selector: 'h2, [role="heading"]' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Title \(English\)/i), {
      target: { value: 'New module' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save module' }));

    await waitFor(() => expect(coursesApi.addCourseModule).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(coursesApi.addCourseModule).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(body.titleEn).toBe('New module');
    expect(body.rowVersion).toBe('RV1');
    await waitFor(() => expect(screen.getByText(/module added/i)).toBeTruthy());
  });

  it('initialises the edit dialog from the selected module', () => {
    renderManager(course());
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    const title = screen.getByLabelText(/Title \(English\)/i) as HTMLInputElement;
    expect(title.value).toBe('Getting started');
  });

  it('does not remove when the confirmation is cancelled', async () => {
    renderManager(course());
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    expect(screen.getByText(/remove this module\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/remove this module\?/i)).toBeNull());
    expect(coursesApi.removeCourseModule).not.toHaveBeenCalled();
  });

  it('confirms removal by calling removeCourseModule', async () => {
    vi.mocked(coursesApi.removeCourseModule).mockResolvedValue(course() as never);
    renderManager(course());

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Remove module' }));

    await waitFor(() => expect(coursesApi.removeCourseModule).toHaveBeenCalledTimes(1));
    const [id, moduleId] = vi.mocked(coursesApi.removeCourseModule).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(moduleId).toBe('m1');
  });

  it('reorders by building the new ordered id array', async () => {
    vi.mocked(coursesApi.reorderCourseModules).mockResolvedValue(course() as never);
    renderManager(course());

    // First module: move down -> [m2, m1].
    fireEvent.click(screen.getAllByRole('button', { name: 'Move module down' })[0]!);

    await waitFor(() => expect(coursesApi.reorderCourseModules).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(coursesApi.reorderCourseModules).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(body.orderedModuleIds).toEqual(['m2', 'm1']);
  });

  it('disables move-up on the first module and move-down on the last', () => {
    renderManager(course());
    const up = screen.getAllByRole('button', { name: 'Move module up' });
    const down = screen.getAllByRole('button', { name: 'Move module down' });
    expect(up[0]!.hasAttribute('disabled')).toBe(true);
    expect(down[down.length - 1]!.hasAttribute('disabled')).toBe(true);
  });

  it('shows the concurrency alert on a 409 reorder conflict', async () => {
    vi.mocked(coursesApi.reorderCourseModules).mockRejectedValue(
      new ApiError(409, 'x', 'k', undefined, undefined, { currentRowVersion: 'RV2' }),
    );
    const { onReloadLatest } = renderManager(course());

    fireEvent.click(screen.getAllByRole('button', { name: 'Move module down' })[0]!);

    await waitFor(() => expect(screen.getByText(/changed since you opened it/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /reload latest/i }));
    expect(onReloadLatest).toHaveBeenCalledTimes(1);
  });

  it('shows a client validation error when the title is empty', async () => {
    renderManager(course());
    fireEvent.click(screen.getByRole('button', { name: 'Add module' }));

    // Make the form dirty via the summary, leave the required title empty.
    fireEvent.change(screen.getByLabelText(/Summary \(English\)/i), {
      target: { value: 'A summary' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save module' }));

    await waitFor(() => expect(screen.getByText(/an english title is required/i)).toBeTruthy());
    expect(coursesApi.addCourseModule).not.toHaveBeenCalled();
  });
});

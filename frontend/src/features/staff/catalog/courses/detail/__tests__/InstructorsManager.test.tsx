import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import { InstructorsManager } from '../InstructorsManager';
import type { AdminCourseDetail } from '../detail-helpers';

vi.mock('@/lib/api/admin/courses');
import * as coursesApi from '@/lib/api/admin/courses';

const UUID = '11111111-1111-1111-1111-111111111111';

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
    modules: [],
    instructors: [
      { instructorUserId: '00000000-0000-0000-0000-0000000000aa', role: 'Lead' },
      { instructorUserId: '00000000-0000-0000-0000-0000000000bb', role: 'Assistant' },
    ],
    publishReadiness: { isReady: true, items: [] },
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
  render(<InstructorsManager course={c} onReloadLatest={onReloadLatest} />, { wrapper: Wrapper });
  return { onReloadLatest };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('InstructorsManager', () => {
  it('renders the assigned instructors with role badges and an assign action', () => {
    renderManager(course());
    expect(screen.getByRole('heading', { name: /course instructors/i })).toBeTruthy();
    expect(screen.getByText('00000000-0000-0000-0000-0000000000aa')).toBeTruthy();
    expect(screen.getByText('Lead')).toBeTruthy();
    expect(screen.getByText('Assistant')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign instructor' })).toBeTruthy();
  });

  it('renders the empty state when no instructors are assigned', () => {
    renderManager(course({ instructors: [] }));
    expect(screen.getByText(/no instructors assigned yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign instructor' })).toBeTruthy();
  });

  it('assigns an instructor with the id, role, and rowVersion', async () => {
    vi.mocked(coursesApi.assignCourseInstructor).mockResolvedValue(course() as never);
    renderManager(course());

    fireEvent.click(screen.getByRole('button', { name: 'Assign instructor' }));
    fireEvent.change(screen.getByLabelText(/instructor user id/i), { target: { value: UUID } });
    // Header + dialog submit share the name; the submit is the last one.
    fireEvent.click(screen.getAllByRole('button', { name: 'Assign instructor' }).at(-1)!);

    await waitFor(() => expect(coursesApi.assignCourseInstructor).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(coursesApi.assignCourseInstructor).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(body.instructorUserId).toBe(UUID);
    expect(body.roleOnCourse).toBe('Lead');
    expect(body.rowVersion).toBe('RV1');
    await waitFor(() => expect(screen.getByText(/instructor assigned/i)).toBeTruthy());
  });

  it('sends the selected Assistant role', async () => {
    vi.mocked(coursesApi.assignCourseInstructor).mockResolvedValue(course() as never);
    renderManager(course());

    fireEvent.click(screen.getByRole('button', { name: 'Assign instructor' }));
    fireEvent.change(screen.getByLabelText(/instructor user id/i), { target: { value: UUID } });
    fireEvent.click(screen.getByRole('radio', { name: /assistant/i }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Assign instructor' }).at(-1)!);

    await waitFor(() => expect(coursesApi.assignCourseInstructor).toHaveBeenCalledTimes(1));
    expect(vi.mocked(coursesApi.assignCourseInstructor).mock.calls[0]![1].roleOnCourse).toBe(
      'Assistant',
    );
  });

  it('does not remove when the confirmation is cancelled', async () => {
    renderManager(course());
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    expect(screen.getByText(/remove this instructor\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/remove this instructor\?/i)).toBeNull());
    expect(coursesApi.removeCourseInstructor).not.toHaveBeenCalled();
  });

  it('confirms removal by calling removeCourseInstructor', async () => {
    vi.mocked(coursesApi.removeCourseInstructor).mockResolvedValue(course() as never);
    renderManager(course());

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Remove instructor' }));

    await waitFor(() => expect(coursesApi.removeCourseInstructor).toHaveBeenCalledTimes(1));
    const [id, instructorUserId] = vi.mocked(coursesApi.removeCourseInstructor).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(instructorUserId).toBe('00000000-0000-0000-0000-0000000000aa');
  });

  it('shows the concurrency alert on a 409 conflict and offers reload', async () => {
    vi.mocked(coursesApi.removeCourseInstructor).mockRejectedValue(
      new ApiError(409, 'x', 'k', undefined, undefined, { currentRowVersion: 'RV2' }),
    );
    const { onReloadLatest } = renderManager(course());

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Remove instructor' }));

    await waitFor(() => expect(screen.getByText(/changed since you opened it/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /reload latest/i }));
    expect(onReloadLatest).toHaveBeenCalledTimes(1);
  });

  it('shows a client validation error for an invalid user id', async () => {
    renderManager(course());
    fireEvent.click(screen.getByRole('button', { name: 'Assign instructor' }));
    fireEvent.change(screen.getByLabelText(/instructor user id/i), { target: { value: 'nope' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Assign instructor' }).at(-1)!);

    await waitFor(() => expect(screen.getByText(/valid user id/i)).toBeTruthy());
    expect(coursesApi.assignCourseInstructor).not.toHaveBeenCalled();
  });

  it('maps a 404 to the user-id field', async () => {
    vi.mocked(coursesApi.assignCourseInstructor).mockRejectedValue(new ApiError(404, 'x', 'k'));
    renderManager(course());

    fireEvent.click(screen.getByRole('button', { name: 'Assign instructor' }));
    fireEvent.change(screen.getByLabelText(/instructor user id/i), { target: { value: UUID } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Assign instructor' }).at(-1)!);

    await waitFor(() => expect(coursesApi.assignCourseInstructor).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/couldn't be found/i)).toBeTruthy());
  });
});

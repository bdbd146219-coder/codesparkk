import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathDetail } from '@/lib/api/admin/learning-paths';
import { LearningPathEditor } from '../LearningPathEditor';

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
    items: [
      {
        id: 'i1',
        courseId: 'c1',
        order: 1,
        note: null,
        courseSlug: 'intro-to-scratch',
        courseTitleEn: 'Intro to Scratch',
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

function Providers({ children, route }: { children: ReactNode; route: string }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function renderEditor(p = path(), route = '/staff/learning-paths/p1', onReload = vi.fn()) {
  render(<LearningPathEditor path={p} onReloadLatest={onReload} />, {
    wrapper: ({ children }) => <Providers route={route}>{children}</Providers>,
  });
  return { onReload };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LearningPathEditor', () => {
  it('renders the editable overview with the slug value and disables Save when pristine', () => {
    renderEditor();
    const slug = screen.getByLabelText('Slug') as HTMLInputElement;
    expect(slug.value).toBe('junior-coder-journey');
    expect(screen.getByRole('button', { name: 'Save changes' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('enables Save on edit and submits the update with the current rowVersion', async () => {
    vi.mocked(pathsApi.updateAdminLearningPath).mockResolvedValue(path({ rowVersion: 'RV2' }));
    renderEditor();

    fireEvent.change(screen.getByRole('combobox', { name: 'Age band' }), {
      target: { value: 'Explorer' },
    });
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save.hasAttribute('disabled')).toBe(false);
    fireEvent.click(save);

    await waitFor(() => expect(pathsApi.updateAdminLearningPath).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(pathsApi.updateAdminLearningPath).mock.calls[0]!;
    expect(id).toBe('p1');
    expect(body.rowVersion).toBe('RV1');
    expect(body.ageBand).toBe('Explorer');
    await waitFor(() => expect(screen.getByText(/changes saved/i)).toBeTruthy());
  });

  it('resets the form on cancel', () => {
    renderEditor();
    const ageBand = screen.getByRole('combobox', { name: 'Age band' }) as HTMLSelectElement;
    fireEvent.change(ageBand, { target: { value: 'Explorer' } });
    expect(ageBand.value).toBe('Explorer');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect((screen.getByRole('combobox', { name: 'Age band' }) as HTMLSelectElement).value).toBe(
      'Junior',
    );
    expect(screen.getByRole('button', { name: 'Save changes' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('shows the concurrency alert on a 409 rowVersion conflict and reloads latest', async () => {
    vi.mocked(pathsApi.updateAdminLearningPath).mockRejectedValue(
      new ApiError(409, 'x', 'k', undefined, undefined, { currentRowVersion: 'RV2' }),
    );
    const { onReload } = renderEditor();

    fireEvent.change(screen.getByRole('combobox', { name: 'Age band' }), {
      target: { value: 'Explorer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText(/changed since you opened it/i)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /reload latest/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('maps a 409 slug clash to the slug field and shows a summary', async () => {
    vi.mocked(pathsApi.updateAdminLearningPath).mockRejectedValue(new ApiError(409, 'x', 'k'));
    renderEditor();

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'taken-slug' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(screen.getByText(/already used by another learning path/i)).toBeTruthy(),
    );
  });

  it('blocks an invalid slug client-side without calling the API', async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'Not A Slug' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(screen.getByText(/use lowercase letters, numbers, and single hyphens/i)).toBeTruthy(),
    );
    expect(pathsApi.updateAdminLearningPath).not.toHaveBeenCalled();
  });

  it('locks the slug when the path is not a draft', () => {
    renderEditor(path({ publishState: 'Published', isListed: true }));
    expect((screen.getByLabelText('Slug') as HTMLInputElement).hasAttribute('disabled')).toBe(true);
  });

  it('renders the functional Items tab with an add control', () => {
    renderEditor(path(), '/staff/learning-paths/p1?tab=items');
    expect(screen.getByText('Intro to Scratch')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add course' })).toBeTruthy();
  });

  it('exposes functional lifecycle actions on the Publishing tab (ready Draft)', () => {
    renderEditor(path(), '/staff/learning-paths/p1?tab=publishing');
    // Ready Draft → Publish is enabled and Archive is available (C3F).
    expect(screen.getByRole('button', { name: 'Publish' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy();
  });

  it('is read-only for an archived path (no Save button, archived note)', () => {
    renderEditor(path({ publishState: 'Archived' }));
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.getByText(/archived learning paths are read-only/i)).toBeTruthy();
  });
});

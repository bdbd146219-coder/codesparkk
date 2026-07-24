import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import { LearningPathCreatePage } from '../LearningPathCreatePage';

vi.mock('@/lib/api/admin/learning-paths');
import * as pathsApi from '@/lib/api/admin/learning-paths';

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/staff/learning-paths/new']}>
        <Routes>
          <Route path="/staff/learning-paths/new" element={children} />
          <Route path="/staff/learning-paths/:id" element={<div>Editor open</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function fillTitle(value = 'My Path') {
  fireEvent.change(screen.getByLabelText(/Title \(English\)/i), { target: { value } });
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LearningPathCreatePage', () => {
  it('renders the key fields, guidance card, and actions', () => {
    render(<LearningPathCreatePage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 1, name: /new learning path/i })).toBeTruthy();
    expect(screen.getByLabelText(/Title \(English\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/Title \(Arabic\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/Slug/i)).toBeTruthy();
    expect(screen.getByLabelText(/Age band/i)).toBeTruthy();
    expect(screen.getByLabelText(/Summary \(English\)/i)).toBeTruthy();
    expect(screen.getByText(/after you create/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /create learning path/i })).toBeTruthy();
    expect(document.querySelector('a[href="/staff/learning-paths"]')).toBeTruthy();
  });

  it('shows a required validation error and does not submit', async () => {
    render(<LearningPathCreatePage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button', { name: /create learning path/i }));
    await waitFor(() => expect(screen.getByText(/an english title is required/i)).toBeTruthy());
    expect(pathsApi.createAdminLearningPath).not.toHaveBeenCalled();
  });

  it('creates a draft and navigates into the editor using the returned id', async () => {
    vi.mocked(pathsApi.createAdminLearningPath).mockResolvedValue({
      id: 'new-id',
      slug: 'my-path',
      publishState: 'Draft',
      rowVersion: 'RV1',
    } as never);
    render(<LearningPathCreatePage />, { wrapper: Wrapper });

    fillTitle('My Path');
    fireEvent.click(screen.getByRole('button', { name: /create learning path/i }));

    await waitFor(() => expect(pathsApi.createAdminLearningPath).toHaveBeenCalledTimes(1));
    const [body] = vi.mocked(pathsApi.createAdminLearningPath).mock.calls[0]!;
    expect(body.titleEn).toBe('My Path');
    expect(body.ageBand).toBe('Junior');
    expect(body.media).toBeUndefined();
    await waitFor(() => expect(screen.getByText('Editor open')).toBeTruthy());
  });

  it('maps a 409 duplicate slug to the slug field and a summary, staying on the page', async () => {
    vi.mocked(pathsApi.createAdminLearningPath).mockRejectedValue(new ApiError(409, 'x', 'k'));
    render(<LearningPathCreatePage />, { wrapper: Wrapper });

    fillTitle('My Path');
    fireEvent.click(screen.getByRole('button', { name: /create learning path/i }));

    await waitFor(() =>
      expect(screen.getByText(/already used by another learning path/i)).toBeTruthy(),
    );
    expect(pathsApi.createAdminLearningPath).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Editor open')).toBeNull();
  });
});

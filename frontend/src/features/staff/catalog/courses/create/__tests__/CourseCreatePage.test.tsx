import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import { CourseCreatePage } from '../CourseCreatePage';

vi.mock('@/lib/api/admin/categories', () => ({
  listAdminCategories: vi.fn().mockResolvedValue({
    items: [{ id: 'cat-1', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' }],
  }),
}));
vi.mock('@/lib/api/admin/courses');
import * as coursesApi from '@/lib/api/admin/courses';

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/staff/courses/new']}>
        <Routes>
          <Route path="/staff/courses/new" element={children} />
          <Route path="/staff/courses/:id" element={<div>Editor open</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function fillMinimum() {
  fireEvent.change(screen.getByLabelText(/Course title \(English\)/i), {
    target: { value: 'My Course' },
  });
  const category = await screen.findByRole('option', { name: 'Foundations' });
  fireEvent.change(category.closest('select')!, { target: { value: 'cat-1' } });
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CourseCreatePage', () => {
  it('renders the key fields, guidance card, and actions', () => {
    render(<CourseCreatePage />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { level: 1, name: /new course/i })).toBeTruthy();
    expect(screen.getByLabelText(/Course title \(English\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/Category/i)).toBeTruthy();
    expect(screen.getByLabelText(/Delivery/i)).toBeTruthy();
    expect(screen.getByLabelText(/Difficulty/i)).toBeTruthy();
    expect(screen.getByLabelText(/Age band/i)).toBeTruthy();
    expect(screen.getByLabelText(/Minimum age/i)).toBeTruthy();
    expect(screen.getByLabelText(/Maximum age/i)).toBeTruthy();
    expect(screen.getByText(/after you create/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /create course/i })).toBeTruthy();
    expect(document.querySelector('a[href="/staff/courses"]')).toBeTruthy();
  });

  it('shows required validation errors and does not submit', async () => {
    render(<CourseCreatePage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button', { name: /create course/i }));
    await waitFor(() => expect(screen.getByText(/an english title is required/i)).toBeTruthy());
    expect(screen.getByText(/choose a category/i)).toBeTruthy();
    expect(coursesApi.createAdminCourse).not.toHaveBeenCalled();
  });

  it('creates a draft and navigates into the editor', async () => {
    vi.mocked(coursesApi.createAdminCourse).mockResolvedValue({
      id: 'new-id',
      slug: 'my-course',
      publishState: 'Draft',
      rowVersion: 'RV1',
    } as never);
    render(<CourseCreatePage />, { wrapper: Wrapper });

    await fillMinimum();
    fireEvent.click(screen.getByRole('button', { name: /create course/i }));

    await waitFor(() => expect(coursesApi.createAdminCourse).toHaveBeenCalledTimes(1));
    const [body] = vi.mocked(coursesApi.createAdminCourse).mock.calls[0]!;
    expect(body.titleEn).toBe('My Course');
    expect(body.primaryCategoryId).toBe('cat-1');
    expect(body.deliveryType).toBe('Recorded');
    expect(body.minAge).toBe(6);
    expect(body.maxAge).toBe(9);
    await waitFor(() => expect(screen.getByText('Editor open')).toBeTruthy());
  });

  it('maps a 409 duplicate slug to the slug field and a summary', async () => {
    vi.mocked(coursesApi.createAdminCourse).mockRejectedValue(new ApiError(409, 'x', 'k'));
    render(<CourseCreatePage />, { wrapper: Wrapper });

    await fillMinimum();
    fireEvent.click(screen.getByRole('button', { name: /create course/i }));

    await waitFor(() => expect(screen.getByText(/already used by another course/i)).toBeTruthy());
    expect(coursesApi.createAdminCourse).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Editor open')).toBeNull();
  });
});

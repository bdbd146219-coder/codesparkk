import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { ApiError } from '@/lib/api/errors';
import type { AdminCategoryDetail } from '@/lib/api/admin/categories';
import { CategoriesListView } from '../CategoriesListView';
import type { CategoriesViewModel, CategoryListItem } from '../format';
import type { CategoryFilterController } from '../use-category-filters';

vi.mock('@/lib/api/admin/categories');
import * as categoriesApi from '@/lib/api/admin/categories';

function cat(overrides: Partial<CategoryListItem> = {}): CategoryListItem {
  return {
    id: 'c1',
    slug: 'foundations',
    nameEn: 'Foundations',
    nameAr: 'الأساسيات',
    icon: null,
    order: 1,
    isActive: true,
    publishedCourseCount: 12,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-20T09:00:00Z',
    rowVersion: 'RV1',
    ...overrides,
  } as CategoryListItem;
}

function detail(overrides: Partial<AdminCategoryDetail> = {}): AdminCategoryDetail {
  return {
    ...cat(),
    descriptionEn: 'Core concepts',
    descriptionAr: 'المفاهيم الأساسية',
    ...overrides,
  } as AdminCategoryDetail;
}

function dataVm(items: CategoryListItem[]): CategoriesViewModel {
  return { status: 'data', items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

function stubFc(overrides: Partial<CategoryFilterController> = {}): CategoryFilterController {
  return {
    values: {},
    query: {},
    hasActiveFilters: false,
    page: 1,
    setValues: vi.fn(),
    setPage: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  };
}

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function renderView(vm: CategoriesViewModel, fc = stubFc(), onRetry = vi.fn()) {
  render(<CategoriesListView fc={fc} vm={vm} isFetching={false} onRetry={onRetry} />, {
    wrapper: Wrapper,
  });
  return { fc, onRetry };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CategoriesListView', () => {
  it('renders the categories list with a heading and the new-category action', () => {
    renderView(dataVm([cat()]));
    expect(screen.getByRole('heading', { name: 'Categories', level: 1 })).toBeTruthy();
    expect(screen.getAllByText('Foundations').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'New category' })).toBeTruthy();
  });

  it('renders the empty state when there are no categories', () => {
    renderView({ status: 'empty', filtered: false });
    expect(screen.getByText(/no categories yet/i)).toBeTruthy();
  });

  it('renders the filtered-empty state with a clear action', () => {
    const fc = stubFc({ hasActiveFilters: true });
    renderView({ status: 'empty', filtered: true }, fc);
    expect(screen.getByText(/no categories match these filters/i)).toBeTruthy();
  });

  it('opens the create dialog and submits a new category', async () => {
    vi.mocked(categoriesApi.createAdminCategory).mockResolvedValue({
      id: 'new',
      slug: 'robotics',
      isActive: true,
      rowVersion: 'RV',
    } as never);
    renderView(dataVm([cat()]));

    fireEvent.click(screen.getByRole('button', { name: 'New category' }));
    fireEvent.change(screen.getByLabelText(/Name \(English\)/i), {
      target: { value: 'Robotics' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() => expect(categoriesApi.createAdminCategory).toHaveBeenCalledTimes(1));
    const [body] = vi.mocked(categoriesApi.createAdminCategory).mock.calls[0]!;
    expect(body.nameEn).toBe('Robotics');
    await waitFor(() => expect(screen.getByText(/category created/i)).toBeTruthy());
  });

  it('shows a client validation error and does not submit an empty create form', async () => {
    renderView(dataVm([cat()]));
    fireEvent.click(screen.getByRole('button', { name: 'New category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() => expect(screen.getByText(/an english name is required/i)).toBeTruthy());
    expect(categoriesApi.createAdminCategory).not.toHaveBeenCalled();
  });

  it('initialises the edit dialog from the fetched detail and updates with its rowVersion', async () => {
    vi.mocked(categoriesApi.getAdminCategory).mockResolvedValue(detail({ rowVersion: 'RVdetail' }));
    vi.mocked(categoriesApi.updateAdminCategory).mockResolvedValue(
      detail({ rowVersion: 'RVnext' }),
    );
    renderView(dataVm([cat()]));

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Foundations' })[0]!);

    const nameInput = (await screen.findByLabelText(/Name \(English\)/i)) as HTMLInputElement;
    await waitFor(() => expect(nameInput.value).toBe('Foundations'));

    fireEvent.change(nameInput, { target: { value: 'Foundations 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(categoriesApi.updateAdminCategory).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(categoriesApi.updateAdminCategory).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(body.rowVersion).toBe('RVdetail');
    expect(body.nameEn).toBe('Foundations 2');
  });

  it('does not deactivate when the confirmation is cancelled', async () => {
    renderView(dataVm([cat()]));
    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate Foundations' })[0]!);
    expect(screen.getByText(/deactivate this category\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/deactivate this category\?/i)).toBeNull());
    expect(categoriesApi.deactivateCategory).not.toHaveBeenCalled();
  });

  it('confirms deactivation by calling deactivateCategory with the rowVersion', async () => {
    vi.mocked(categoriesApi.deactivateCategory).mockResolvedValue(detail({ isActive: false }));
    renderView(dataVm([cat()]));

    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate Foundations' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate category' }));

    await waitFor(() => expect(categoriesApi.deactivateCategory).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(categoriesApi.deactivateCategory).mock.calls[0]!;
    expect(id).toBe('c1');
    expect(body.rowVersion).toBe('RV1');
  });

  it('activates an inactive category via activateCategory', async () => {
    vi.mocked(categoriesApi.activateCategory).mockResolvedValue(detail({ isActive: true }));
    renderView(dataVm([cat({ isActive: false })]));

    fireEvent.click(screen.getAllByRole('button', { name: 'Activate Foundations' })[0]!);
    expect(screen.getByText(/activate this category\?/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Activate category' }));

    await waitFor(() => expect(categoriesApi.activateCategory).toHaveBeenCalledTimes(1));
  });

  it('shows a safe concurrency message on a 409 deactivate conflict', async () => {
    vi.mocked(categoriesApi.deactivateCategory).mockRejectedValue(
      new ApiError(409, 'x', 'k', undefined, undefined, { currentRowVersion: 'RV2' }),
    );
    const { onRetry } = renderView(dataVm([cat()]));

    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate Foundations' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate category' }));

    await waitFor(() => expect(screen.getByText(/changed since you opened it/i)).toBeTruthy());
    expect(onRetry).toHaveBeenCalled();
  });
});

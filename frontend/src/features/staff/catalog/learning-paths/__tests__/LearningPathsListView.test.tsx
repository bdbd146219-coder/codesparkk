import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { LearningPathsListView } from '../LearningPathsListView';
import type { LearningPathsViewModel, LearningPathListItem } from '../format';
import type { LearningPathFilterController } from '../use-learning-path-filters';

function path(overrides: Partial<LearningPathListItem> = {}): LearningPathListItem {
  return {
    id: 'p1',
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    ageBand: 'Junior',
    publishState: 'Published',
    isListed: true,
    itemCount: 6,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-20T09:00:00Z',
    publishedAt: '2026-05-01T09:00:00Z',
    archivedAt: null,
    rowVersion: 'RV1',
    ...overrides,
  } as LearningPathListItem;
}

function dataVm(items: LearningPathListItem[]): LearningPathsViewModel {
  return { status: 'data', items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

function stubFc(
  overrides: Partial<LearningPathFilterController> = {},
): LearningPathFilterController {
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
  return <MemoryRouter>{children}</MemoryRouter>;
}

function renderView(vm: LearningPathsViewModel, fc = stubFc(), onRetry = vi.fn()) {
  render(<LearningPathsListView fc={fc} vm={vm} isFetching={false} onRetry={onRetry} />, {
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

describe('LearningPathsListView', () => {
  it('renders the list with a heading, a path, its status, and a Manage link to the detail route', () => {
    renderView(dataVm([path()]));
    expect(screen.getByRole('heading', { name: 'Learning paths', level: 1 })).toBeTruthy();
    expect(screen.getAllByText('Junior Coder Journey').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    const manage = screen.getAllByRole('link', { name: 'Manage Junior Coder Journey' });
    expect(manage.length).toBeGreaterThan(0);
    expect(manage[0]!.getAttribute('href')).toBe('/staff/learning-paths/p1');
  });

  it('renders the New learning path action as a link to the create page (C3G)', () => {
    renderView(dataVm([path()]));
    const newLink = screen.getByRole('link', { name: /New learning path/i });
    expect(newLink.getAttribute('href')).toBe('/staff/learning-paths/new');
  });

  it('renders the empty state when there are no learning paths', () => {
    renderView({ status: 'empty', filtered: false });
    expect(screen.getByText(/no learning paths yet/i)).toBeTruthy();
  });

  it('renders the filtered-empty state and clears filters', () => {
    const fc = stubFc({ hasActiveFilters: true });
    renderView({ status: 'empty', filtered: true }, fc);
    expect(screen.getByText(/no learning paths match these filters/i)).toBeTruthy();
    // "Clear filters" appears in both the filter bar and the empty-state CTA; both call clear.
    fireEvent.click(screen.getAllByRole('button', { name: /clear filters/i })[0]!);
    expect(fc.clear).toHaveBeenCalled();
  });

  it('renders the error state and retries', () => {
    const { onRetry } = renderView({
      status: 'error',
      messageKey: 'staff.catalog.learningPaths.list.error.body',
    });
    expect(screen.getByText(/couldn't load learning paths/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('serialises a status filter change to the URL controller', () => {
    const fc = stubFc();
    renderView(dataVm([path()]), fc);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Draft' } });
    expect(fc.setValues).toHaveBeenCalledWith({ status: 'Draft' });
  });
});

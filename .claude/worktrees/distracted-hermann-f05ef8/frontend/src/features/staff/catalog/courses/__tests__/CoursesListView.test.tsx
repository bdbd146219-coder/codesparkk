import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { CoursesListView, type CoursesListViewProps } from '../CoursesListView';
import type { CourseListItem, CoursesViewModel } from '../format';
import type { CourseFilterController } from '../use-course-filters';

function stubFc(overrides: Partial<CourseFilterController> = {}): CourseFilterController {
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

function renderView(vm: CoursesViewModel, extra: Partial<CoursesListViewProps> = {}) {
  const props: CoursesListViewProps = {
    fc: stubFc(),
    categoryOptions: [],
    vm,
    isFetching: false,
    onRetry: vi.fn(),
    ...extra,
  };
  render(
    <MemoryRouter>
      <CoursesListView {...props} />
    </MemoryRouter>,
  );
  return props;
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());

describe('CoursesListView', () => {
  it('renders the unfiltered empty state with a create CTA', () => {
    renderView({ status: 'empty', filtered: false });
    expect(screen.getByText(/no courses yet/i)).toBeTruthy();
    expect(document.querySelector('a[href="/staff/courses/new"]')).toBeTruthy();
  });

  it('renders the filtered empty state with a clear action', () => {
    const fc = stubFc({ hasActiveFilters: true });
    renderView({ status: 'empty', filtered: true }, { fc });
    expect(screen.getByText(/no courses match these filters/i)).toBeTruthy();
  });

  it('renders the error state and retries on click', () => {
    const onRetry = vi.fn();
    renderView(
      { status: 'error', messageKey: 'staff.catalog.courses.list.error.body' },
      { onRetry },
    );
    expect(screen.getByText(/couldn't load courses/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders rows that link to the course detail route', () => {
    const item = {
      id: 'course-123',
      slug: 'intro-to-scratch',
      titleEn: 'Intro to Scratch',
      titleAr: null,
      publishState: 'Published',
      isListed: true,
      deliveryType: 'Recorded',
      difficulty: 'Beginner',
      ageBand: 'Junior',
      minAge: 6,
      maxAge: 9,
      category: { id: 'c1', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
      updatedAt: '2026-06-20T09:00:00Z',
    } as CourseListItem;

    renderView({
      status: 'data',
      items: [item],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });

    expect(screen.getAllByText('Intro to Scratch').length).toBeGreaterThan(0);
    expect(document.querySelector('a[href="/staff/courses/course-123"]')).toBeTruthy();
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
  });

  it('shows pagination only when there is more than one page', () => {
    renderView({
      status: 'data',
      items: [],
      page: 2,
      pageSize: 20,
      totalItems: 42,
      totalPages: 3,
    });
    expect(screen.getByText(/page 2 of 3/i)).toBeTruthy();
    const prev = screen.getByRole('button', { name: /previous/i });
    expect(prev.hasAttribute('disabled')).toBe(false);
  });
});

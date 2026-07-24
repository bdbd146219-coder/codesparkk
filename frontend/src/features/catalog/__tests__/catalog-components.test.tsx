import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import type { CatalogCourseCard, CatalogPathCard } from '@/lib/api/catalog';
import { PublicCourseCard } from '../components/PublicCourseCard';
import { PublicLearningPathCard } from '../components/PublicLearningPathCard';
import { CoursesBrowseView } from '../courses/CoursesBrowseView';
import type { CourseCatalogFilterController } from '../courses/course-catalog-filters';
import type { CatalogViewModel } from '../shared';

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

const course: CatalogCourseCard = {
  slug: 'intro-to-scratch',
  title: 'Intro to Scratch',
  subtitle: '',
  summary: 'Build your first animations and games.',
  ageBand: 'Junior',
  minAge: 6,
  maxAge: 9,
  deliveryType: 'Recorded',
  difficulty: 'Beginner',
  category: { slug: 'foundations', name: 'Foundations' },
  thumbnailKey: null,
  thumbnailAlt: null,
  instructors: [],
  pricing: { model: 'Free', amount: null, currency: null },
  outcomesPreview: [],
};

const path: CatalogPathCard = {
  slug: 'junior-coder-journey',
  title: 'Junior Coder Journey',
  summary: 'A guided path from first blocks to first programs.',
  ageBand: 'Junior',
  courseCount: 6,
  thumbnailKey: null,
  thumbnailAlt: null,
};

function stubFc(
  overrides: Partial<CourseCatalogFilterController> = {},
): CourseCatalogFilterController {
  return {
    values: { q: '', category: '', ageBand: '', sort: 'recent', page: 1 },
    query: {},
    hasActiveFilters: false,
    page: 1,
    setValues: vi.fn(),
    setPage: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  };
}

function renderView(vm: CatalogViewModel<CatalogCourseCard>, fc = stubFc(), onRetry = vi.fn()) {
  render(
    <CoursesBrowseView fc={fc} vm={vm} categories={[]} isFetching={false} onRetry={onRetry} />,
    {
      wrapper: Wrapper,
    },
  );
  return { fc, onRetry };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PublicCourseCard', () => {
  it('renders the title, summary, category, age range, and a details link', () => {
    render(<PublicCourseCard course={course} />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: 'Intro to Scratch' })).toBeTruthy();
    expect(screen.getByText(/build your first animations/i)).toBeTruthy();
    expect(screen.getByText('Foundations')).toBeTruthy();
    expect(screen.getByText(/6–9/)).toBeTruthy();
    expect(document.querySelector('a[href="/catalog/courses/intro-to-scratch"]')).toBeTruthy();
  });
});

describe('PublicLearningPathCard', () => {
  it('renders the title, course count, and a path link', () => {
    render(<PublicLearningPathCard path={path} />, { wrapper: Wrapper });
    expect(screen.getByRole('heading', { name: 'Junior Coder Journey' })).toBeTruthy();
    expect(screen.getByText(/6 courses/i)).toBeTruthy();
    expect(
      document.querySelector('a[href="/catalog/learning-paths/junior-coder-journey"]'),
    ).toBeTruthy();
  });
});

describe('CoursesBrowseView', () => {
  it('renders course cards and a result count on the data state', () => {
    renderView({ status: 'data', items: [course], page: 1, totalItems: 1, totalPages: 1 });
    expect(screen.getByRole('heading', { name: 'Intro to Scratch' })).toBeTruthy();
    expect(screen.getByText(/1 courses/i)).toBeTruthy();
  });

  it('renders the filtered-empty state with a working clear-filters action', () => {
    const { fc } = renderView({ status: 'empty', filtered: true });
    expect(screen.getByText(/no courses match your filters/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(fc.clear).toHaveBeenCalledTimes(1);
  });

  it('renders the error state with a working retry action', () => {
    const { onRetry } = renderView({ status: 'error', messageKey: 'catalog.courses.error.body' });
    expect(screen.getByText(/couldn't load courses/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

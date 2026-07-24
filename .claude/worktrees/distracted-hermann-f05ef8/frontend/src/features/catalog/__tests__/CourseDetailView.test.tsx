import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import type { CatalogCourseDetail } from '@/lib/api/catalog';
import { CourseDetailView } from '../detail/CourseDetailView';
import type { CourseDetailViewModel } from '../detail/course-detail';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderView(vm: CourseDetailViewModel, onRetry = vi.fn()) {
  render(<CourseDetailView vm={vm} lang="en" onRetry={onRetry} />, { wrapper: Wrapper });
  return { onRetry };
}

const rich: CatalogCourseDetail = {
  slug: 'python-adventures',
  title: 'Python Adventures',
  subtitle: 'Write real code',
  summary: 'Turn curiosity into real Python skills.',
  description: 'A longer description of the course.',
  ageBand: 'Explorer',
  minAge: 10,
  maxAge: 14,
  deliveryType: 'Hybrid',
  difficulty: 'Intermediate',
  category: { slug: 'foundations', name: 'Foundations' },
  thumbnailKey: null,
  thumbnailAlt: null,
  heroKey: null,
  promoVideoUrl: 'https://example.com/intro',
  instructors: [],
  pricing: { model: 'Free', amount: null, currency: null },
  outcomes: ['Read and write Python', 'Build small games'],
  modulesPreview: [{ title: 'Getting started', summary: 'Meet the console.', order: 1 }],
  availableLocales: ['en', 'ar'],
};

const minimal: CatalogCourseDetail = {
  slug: 'robotics-basics',
  title: 'Robotics Basics',
  subtitle: '',
  summary: 'Bring code to life.',
  description: '',
  ageBand: 'Junior',
  minAge: 7,
  maxAge: 9,
  deliveryType: 'Live',
  difficulty: 'Beginner',
  category: undefined,
  thumbnailKey: null,
  thumbnailAlt: null,
  heroKey: null,
  promoVideoUrl: null,
  instructors: [],
  pricing: { model: 'Free', amount: null, currency: null },
  outcomes: [],
  modulesPreview: [],
  availableLocales: ['en'],
};

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CourseDetailView — rich course', () => {
  it('renders the hero title, summary, metadata badges, and sections', () => {
    renderView({ status: 'data', course: rich });
    expect(screen.getByRole('heading', { level: 1, name: 'Python Adventures' })).toBeTruthy();
    expect(screen.getByText(/turn curiosity into real python/i)).toBeTruthy();
    // Metadata appears in both the hero badges and the sidebar details list.
    expect(screen.getAllByText('Explorer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Intermediate').length).toBeGreaterThan(0);
    expect(screen.getByText(/about this course/i)).toBeTruthy();
    expect(screen.getByText(/what your child will learn/i)).toBeTruthy();
    expect(screen.getByText(/course modules/i)).toBeTruthy();
    expect(screen.getByText('Getting started')).toBeTruthy();
    expect(screen.getByText(/free/i)).toBeTruthy();
    expect(document.querySelector('a[href="/catalog/courses"]')).toBeTruthy();
  });

  it('shows an honest interest CTA that opens the form and never links to checkout/payment', () => {
    renderView({ status: 'data', course: rich });
    const cta = screen.getByRole('button', { name: /register interest/i });
    expect(cta.hasAttribute('disabled')).toBe(false);
    const anchors = Array.from(document.querySelectorAll('a')).map(
      (a) => a.getAttribute('href') ?? '',
    );
    expect(anchors.some((h) => /checkout|payment|enroll|cart/i.test(h))).toBe(false);
    // Opens the pre-commerce interest form (no access/payment claims).
    fireEvent.click(cta);
    expect(screen.getByText(/interested in this course/i)).toBeTruthy();
  });
});

describe('CourseDetailView — minimal course', () => {
  it('omits the about / outcomes / modules sections when those fields are empty', () => {
    renderView({ status: 'data', course: minimal });
    expect(screen.getByRole('heading', { level: 1, name: 'Robotics Basics' })).toBeTruthy();
    expect(screen.queryByText(/about this course/i)).toBeNull();
    expect(screen.queryByText(/what your child will learn/i)).toBeNull();
    expect(screen.queryByText(/course modules/i)).toBeNull();
  });
});

describe('CourseDetailView — non-data states', () => {
  it('renders a not-found panel with a back link', () => {
    renderView({ status: 'notfound' });
    expect(screen.getByText(/course not found/i)).toBeTruthy();
    expect(document.querySelector('a[href="/catalog/courses"]')).toBeTruthy();
  });

  it('renders an error panel with a working retry and a back link', () => {
    const { onRetry } = renderView({
      status: 'error',
      messageKey: 'catalog.courses.detail.error.body',
    });
    expect(screen.getByText(/couldn't load this course/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[href="/catalog/courses"]')).toBeTruthy();
  });
});

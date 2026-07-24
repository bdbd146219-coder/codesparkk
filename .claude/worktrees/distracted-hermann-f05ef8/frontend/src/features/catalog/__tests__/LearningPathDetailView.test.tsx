import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import type { CatalogCourseCard, CatalogPathDetail } from '@/lib/api/catalog';
import { LearningPathDetailView } from '../detail/LearningPathDetailView';
import type { LearningPathDetailViewModel } from '../detail/learning-path-detail';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderView(vm: LearningPathDetailViewModel, onRetry = vi.fn()) {
  render(<LearningPathDetailView vm={vm} onRetry={onRetry} />, { wrapper: Wrapper });
  return { onRetry };
}

function course(slug: string, title: string): CatalogCourseCard {
  return {
    slug,
    title,
    subtitle: '',
    summary: `${title} summary.`,
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
}

const rich: CatalogPathDetail = {
  slug: 'junior-coder-journey',
  title: 'Junior Coder Journey',
  summary: 'A guided path from first blocks to first programs.',
  ageBand: 'Junior',
  thumbnailKey: null,
  thumbnailAlt: null,
  courses: [
    course('intro-to-scratch', 'Intro to Scratch'),
    course('python-adventures', 'Python Adventures'),
    course('web-wizards-html-css', 'Web Wizards: HTML & CSS'),
  ],
};

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LearningPathDetailView — rich path', () => {
  it('renders the hero, the course-count badge, and the ordered course sequence', () => {
    renderView({ status: 'data', path: rich });
    expect(screen.getByRole('heading', { level: 1, name: 'Junior Coder Journey' })).toBeTruthy();
    expect(screen.getByText(/a guided path from first blocks/i)).toBeTruthy();
    expect(screen.getByText(/3 courses/i)).toBeTruthy();
    expect(screen.getByText(/course sequence/i)).toBeTruthy();

    // Scope to the sequence <ol> so the sidebar card titles aren't counted.
    const titles = Array.from(document.querySelectorAll('ol li h3')).map((h) => h.textContent);
    expect(titles).toEqual(['Intro to Scratch', 'Python Adventures', 'Web Wizards: HTML & CSS']);

    expect(document.querySelector('a[href="/catalog/courses/intro-to-scratch"]')).toBeTruthy();
    expect(document.querySelector('a[href="/catalog/courses/python-adventures"]')).toBeTruthy();
  });

  it('shows an honest interest CTA that opens the form and never links to checkout/payment/progress', () => {
    renderView({ status: 'data', path: rich });
    const cta = screen.getByRole('button', { name: /register interest/i });
    expect(cta.hasAttribute('disabled')).toBe(false);
    const anchors = Array.from(document.querySelectorAll('a')).map(
      (a) => a.getAttribute('href') ?? '',
    );
    expect(anchors.some((h) => /checkout|payment|progress|enroll|cart/i.test(h))).toBe(false);
    expect(document.querySelector('a[href="/catalog/learning-paths"]')).toBeTruthy();
    fireEvent.click(cta);
    expect(screen.getByText(/interested in this learning path/i)).toBeTruthy();
  });
});

describe('LearningPathDetailView — other states', () => {
  it('renders a friendly empty-courses state when the path has no courses', () => {
    renderView({ status: 'data', path: { ...rich, courses: [] } });
    expect(screen.getByText(/courses for this path are coming soon/i)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Intro to Scratch' })).toBeNull();
  });

  it('renders a not-found panel with a back link', () => {
    renderView({ status: 'notfound' });
    expect(screen.getByText(/learning path not found/i)).toBeTruthy();
    expect(document.querySelector('a[href="/catalog/learning-paths"]')).toBeTruthy();
  });

  it('renders an error panel with a working retry and a back link', () => {
    const { onRetry } = renderView({
      status: 'error',
      messageKey: 'catalog.learningPaths.detail.error.body',
    });
    expect(screen.getByText(/couldn't load this learning path/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[href="/catalog/learning-paths"]')).toBeTruthy();
  });
});

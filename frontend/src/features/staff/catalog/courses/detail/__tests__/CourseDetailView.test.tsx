import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { CourseDetailView } from '../CourseDetailView';
import type { AdminCourseDetail, CourseDetailViewModel } from '../detail-helpers';

// The editor pulls category options; keep it offline + deterministic.
vi.mock('@/lib/api/admin/categories', () => ({
  listAdminCategories: vi.fn().mockResolvedValue({ items: [] }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[Wrapper.entry]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}
Wrapper.entry = '/staff/courses/c1';

function course(overrides: Partial<AdminCourseDetail> = {}): AdminCourseDetail {
  return {
    id: 'c1',
    slug: 'python-adventures',
    titleEn: 'Python Adventures',
    titleAr: 'مغامرات بايثون',
    publishState: 'Draft',
    isListed: false,
    deliveryType: 'Hybrid',
    difficulty: 'Intermediate',
    ageBand: 'Explorer',
    minAge: 10,
    maxAge: 14,
    category: { id: 'c2', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
    outcomes: [],
    modules: [{ id: 'm1', titleEn: 'Getting started', titleAr: 'البداية', order: 1 }],
    instructors: [{ instructorUserId: 'user-aa', role: 'Lead' }],
    publishReadiness: {
      isReady: false,
      items: [
        {
          code: 'thumbnail-missing',
          messageKey: 'courses.readiness.thumbnailMissing',
          satisfied: false,
          message: 'A thumbnail is required.',
        },
      ],
    },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    ...overrides,
  } as AdminCourseDetail;
}

function renderDetail(vm: CourseDetailViewModel, tab?: string, onRetry = vi.fn()) {
  Wrapper.entry = tab ? `/staff/courses/c1?tab=${tab}` : '/staff/courses/c1';
  render(<CourseDetailView vm={vm} onRetry={onRetry} />, { wrapper: Wrapper });
  return { onRetry };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());

describe('CourseDetailView', () => {
  it('renders the title, slug, and status on the overview tab', () => {
    renderDetail({ status: 'data', course: course() });
    expect(screen.getByRole('heading', { level: 1, name: 'Python Adventures' })).toBeTruthy();
    expect(screen.getAllByText('python-adventures').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
  });

  it('renders the readiness checklist on the publishing tab', () => {
    renderDetail({ status: 'data', course: course() }, 'publishing');
    expect(screen.getByText(/not ready to publish/i)).toBeTruthy();
    expect(screen.getByText(/thumbnail/i)).toBeTruthy();
  });

  it('renders a ready readiness panel when the course is publishable', () => {
    renderDetail(
      { status: 'data', course: course({ publishReadiness: { isReady: true, items: [] } }) },
      'publishing',
    );
    expect(screen.getByText(/ready to publish/i)).toBeTruthy();
  });

  it('renders the modules manager with the module list', () => {
    renderDetail({ status: 'data', course: course() }, 'modules');
    expect(screen.getByText('Getting started')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /course modules/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add module' })).toBeTruthy();
  });

  it('renders the instructors manager with the assigned list', () => {
    renderDetail({ status: 'data', course: course() }, 'instructors');
    expect(screen.getByText('user-aa')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /course instructors/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Assign instructor' })).toBeTruthy();
  });

  it('renders the error state with retry and back link', () => {
    const { onRetry } = renderDetail({
      status: 'error',
      messageKey: 'staff.catalog.courses.detail.error.body',
    });
    expect(screen.getByText(/couldn't load this course/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[href="/staff/courses"]')).toBeTruthy();
  });

  it('renders the not-found state with a back link', () => {
    renderDetail({ status: 'notfound' });
    expect(screen.getByText(/course not found/i)).toBeTruthy();
    expect(document.querySelector('a[href="/staff/courses"]')).toBeTruthy();
  });

  it('renders a loading skeleton', () => {
    renderDetail({ status: 'loading' });
    expect(screen.getByRole('status')).toBeTruthy();
  });
});

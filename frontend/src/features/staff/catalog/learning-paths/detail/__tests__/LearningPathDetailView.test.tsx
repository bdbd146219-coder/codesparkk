import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { LearningPathDetailView } from '../LearningPathDetailView';
import type { LearningPathDetailViewModel } from '../detail-helpers';
import type { AdminLearningPathDetail } from '@/lib/api/admin/learning-paths';

function path(): AdminLearningPathDetail {
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
    items: [],
    readiness: { isReady: true, items: [] },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    publishedAt: null,
    archivedAt: null,
    deletedAt: null,
    rowVersion: 'RV1',
  } as AdminLearningPathDetail;
}

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

function renderView(vm: LearningPathDetailViewModel, onRetry = vi.fn()) {
  render(<LearningPathDetailView vm={vm} onRetry={onRetry} onReloadLatest={vi.fn()} />, {
    wrapper: Providers,
  });
  return { onRetry };
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LearningPathDetailView', () => {
  it('renders the error state with a working retry and a back link', () => {
    const { onRetry } = renderView({
      status: 'error',
      messageKey: 'staff.catalog.learningPaths.detail.error.body',
    });
    expect(screen.getByText(/couldn't load this learning path/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /back to learning paths/i })).toBeTruthy();
  });

  it('renders a distinct not-found state', () => {
    renderView({ status: 'notfound' });
    expect(screen.getByText(/learning path not found/i)).toBeTruthy();
  });

  it('renders a distinct forbidden state', () => {
    renderView({ status: 'forbidden' });
    expect(screen.getByText(/access restricted/i)).toBeTruthy();
  });

  it('renders the editable editor shell on the data branch', () => {
    renderView({ status: 'data', path: path() });
    expect(screen.getByRole('heading', { name: 'Junior Coder Journey', level: 1 })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });
});

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { AuthContext, type AuthContextValue } from '@/lib/auth/auth-context';
import { AppRouter } from '../router';

// Anonymous auth stub — avoids mounting the real AuthProvider (which would fire
// a network refresh). Mirrors the pattern in guards/__tests__/guards.test.tsx.
const anonymousAuth = {
  status: 'anonymous',
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  login: async () => ({}) as never,
  logout: async () => {},
  refresh: async () => false,
  clear: () => {},
} as AuthContextValue;

function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="pathname">{pathname}</div>;
}

function renderAppAt(path: string, enableQaRoutes: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={anonymousAuth}>
          <LocationProbe />
          <AppRouter enableQaRoutes={enableQaRoutes} />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());

describe('AppRouter — QA-only route production gate', () => {
  const designSystemTitle = i18n.t('designSystem.title'); // "Design System"
  const skeletonTitle = i18n.t('skeleton.title'); // "Foundation ready"

  describe('development / test mode (enableQaRoutes = true)', () => {
    it('registers /design-system and renders the QA page', async () => {
      renderAppAt('/design-system', true);
      // Lazy-loaded → await the Suspense boundary resolving.
      expect(await screen.findByText(designSystemTitle)).toBeTruthy();
      expect(screen.getByTestId('pathname').textContent).toBe('/design-system');
    });

    it('registers /skeleton and renders the QA page', async () => {
      renderAppAt('/skeleton', true);
      expect(await screen.findByText(skeletonTitle)).toBeTruthy();
      expect(screen.getByTestId('pathname').textContent).toBe('/skeleton');
    });
  });

  describe('production mode (enableQaRoutes = false)', () => {
    it('does NOT register /design-system — falls through to the home redirect', async () => {
      renderAppAt('/design-system', false);
      await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));
      // The QA component is never rendered / exposed.
      expect(screen.queryByText(designSystemTitle)).toBeNull();
    });

    it('does NOT register /skeleton — falls through to the home redirect', async () => {
      renderAppAt('/skeleton', false);
      await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));
      expect(screen.queryByText(skeletonTitle)).toBeNull();
    });

    it('exposes no navigation links to the QA routes on the landing page', () => {
      renderAppAt('/', false);
      expect(document.querySelector('a[href="/design-system"]')).toBeNull();
      expect(document.querySelector('a[href="/skeleton"]')).toBeNull();
    });
  });

  describe('unknown-route behavior is unchanged', () => {
    it('redirects an unknown route to the marketing home in production mode', async () => {
      renderAppAt('/definitely-not-a-real-route', false);
      await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));
    });

    it('still redirects an unknown route to the marketing home in dev mode', async () => {
      renderAppAt('/definitely-not-a-real-route', true);
      await waitFor(() => expect(screen.getByTestId('pathname').textContent).toBe('/'));
      // A genuinely unknown route must not accidentally match a QA route.
      expect(screen.queryByText(designSystemTitle)).toBeNull();
      expect(screen.queryByText(skeletonTitle)).toBeNull();
    });
  });
});

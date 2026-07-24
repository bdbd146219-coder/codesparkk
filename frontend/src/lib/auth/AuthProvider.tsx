import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi, type AuthenticatedUser } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/errors';
import { setAccessTokenAccessor } from '@/lib/api/client';
import { AuthContext, type AuthContextValue, type AuthState } from './auth-context';

const initialState: AuthState = {
  status: 'loading',
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
};

/**
 * Dev-only: map a `?devRole=` token to backend-style PascalCase role names so
 * the synthesised session flows through the same role normaliser as a real
 * login. Defaults to Parent. Inert in production (the only caller is guarded by
 * `import.meta.env.DEV`).
 */
function devBypassRoles(token: string | null): string[] {
  switch ((token ?? 'parent').toLowerCase().replace(/[^a-z]/g, '')) {
    case 'admin':
      return ['Admin'];
    case 'superadmin':
      return ['SuperAdmin'];
    case 'instructor':
      return ['Instructor'];
    case 'student':
      return ['Student'];
    default:
      return ['Parent'];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  // Mirror token in a ref so the API client's accessor reads the latest value
  // without depending on React state propagation.
  const tokenRef = useRef<string | null>(null);
  const refreshInFlight = useRef<Promise<boolean> | null>(null);
  const refreshTimer = useRef<number | null>(null);

  // Register the accessor exactly once — the closure reads `tokenRef.current`.
  useEffect(() => {
    setAccessTokenAccessor(() => tokenRef.current);
  }, []);

  const applySession = useCallback(
    (token: string, expiresAt: string | Date, user: AuthenticatedUser | null) => {
      tokenRef.current = token;
      const expiry = new Date(expiresAt).getTime();
      setState((prev) => ({
        status: 'authenticated',
        user: user ?? prev.user,
        accessToken: token,
        accessTokenExpiresAt: expiry,
      }));
    },
    [],
  );

  const goAnonymous = useCallback(() => {
    tokenRef.current = null;
    if (refreshTimer.current !== null) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    setState({ status: 'anonymous', user: null, accessToken: null, accessTokenExpiresAt: null });
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const promise = (async () => {
      try {
        const refreshed = await authApi.refresh();
        if (!refreshed.accessToken || !refreshed.accessTokenExpiresAt) {
          goAnonymous();
          return false;
        }
        tokenRef.current = refreshed.accessToken;
        const me = await authApi.me().catch(() => null);
        applySession(refreshed.accessToken, refreshed.accessTokenExpiresAt, me);
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          // 401 on refresh = no valid cookie; treat as anonymous, not an error.
          if (err.status === 401) {
            goAnonymous();
            return false;
          }
        }
        goAnonymous();
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = promise;
    return promise;
  }, [applySession, goAnonymous]);

  // Schedule a silent refresh ~60s before the access token expires.
  useEffect(() => {
    if (refreshTimer.current !== null) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (state.status !== 'authenticated' || !state.accessTokenExpiresAt) return;
    const msUntilRefresh = Math.max(state.accessTokenExpiresAt - Date.now() - 60_000, 5_000);
    refreshTimer.current = window.setTimeout(() => {
      void refresh();
    }, msUntilRefresh);
    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [state.status, state.accessTokenExpiresAt, refresh]);

  // Initial silent refresh on mount — the only place we attempt a refresh
  // proactively without a user action.
  useEffect(() => {
    // Dev-only visual-QA bypass: ?devAuth=1 synthesises an authenticated
    // session so guarded routes (notably /parent and the staff catalog) can be
    // screenshotted without spinning up the backend. ?devRole=admin|superadmin|
    // instructor|parent|student picks the role(s) so guard/Forbidden states can
    // be captured too. Stripped from production builds.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('devAuth') === '1') {
        const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
        applySession('dev-bypass-token', expiresAt, {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'dev-parent@example.test',
          displayName: 'Layla',
          roles: devBypassRoles(params.get('devRole')),
          emailVerified: true,
          preferredLocale: 'en',
          timeZone: 'UTC',
          createdAt: new Date().toISOString(),
        } as AuthenticatedUser);
        return;
      }
    }
    void refresh();
    // Intentionally only on mount; refresh is stable enough not to flap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      if (!response.accessToken || !response.accessTokenExpiresAt) {
        throw new Error('Login response missing access token');
      }
      applySession(response.accessToken, response.accessTokenExpiresAt, response.user ?? null);
      return response;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* logout is idempotent server-side; swallow */
    } finally {
      goAnonymous();
    }
  }, [goAnonymous]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refresh,
      clear: goAnonymous,
    }),
    [state, login, logout, refresh, goAnonymous],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

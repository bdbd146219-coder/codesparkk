import { createContext } from 'react';
import type { AuthenticatedUser, LoginResponse } from '@/lib/api/auth';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: number | null; // ms epoch
}

export interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<LoginResponse>;
  logout(): Promise<void>;
  refresh(): Promise<boolean>;
  /** Force-clears auth state (used when the API client sees 401 mid-flight). */
  clear(): void;
}

/**
 * Auth context object lives in its own module (no component, no hook) so that
 * `AuthProvider.tsx` can export *only* the component — which keeps React Fast
 * Refresh happy (`react-refresh/only-export-components`). Consumers read it
 * through the `useAuth` hook, never directly.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

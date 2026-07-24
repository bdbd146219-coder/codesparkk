import { useAuth } from './use-auth';
import { primaryRole } from './roles';
import type { AppRole } from '@/lib/navigation';

/**
 * The current user's highest-privilege {@link AppRole}, or `undefined` while
 * anonymous / loading. Used by role-aware nav filtering. Returns `undefined`
 * (a no-op for the nav filters) until auth resolves an authenticated user.
 */
export function useCurrentRole(): AppRole | undefined {
  const auth = useAuth();
  if (auth.status !== 'authenticated') return undefined;
  return primaryRole(auth.user?.roles);
}

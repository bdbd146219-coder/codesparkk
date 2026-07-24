import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * Gate any route that requires an authenticated parent.
 * - During the initial silent refresh, renders nothing (no UI flash).
 * - Anonymous users are redirected to `/auth/login?return=<currentPath>`.
 * - Authenticated users see the nested route.
 */
export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return null;
  }
  if (auth.status !== 'authenticated') {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    const params = new URLSearchParams();
    params.set('return', returnPath);
    return <Navigate to={`/auth/login?${params.toString()}`} replace />;
  }
  return <Outlet />;
}

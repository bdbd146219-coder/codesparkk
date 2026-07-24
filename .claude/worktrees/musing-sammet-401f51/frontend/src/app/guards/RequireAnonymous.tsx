import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth/use-auth';
import { safeReturnUrl } from '@/lib/auth/return-url';

/**
 * Gate any route that requires an *anonymous* visitor (the auth pages).
 * Authenticated users are bounced to `?return=` if it is same-origin, else
 * to the parent default surface.
 */
export function RequireAnonymous() {
  const auth = useAuth();
  const [params] = useSearchParams();

  if (auth.status === 'loading') {
    return null;
  }
  if (auth.status === 'authenticated') {
    const target = safeReturnUrl(params.get('return'));
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/use-auth';
import { hasAnyRole } from '@/lib/auth/roles';
import type { AppRole } from '@/lib/navigation';
import { ForbiddenPage } from '@/features/staff/ForbiddenPage';

export interface RequireRoleProps {
  /** Roles permitted to see the nested route. */
  allow: ReadonlyArray<AppRole>;
}

/**
 * Generic role guard for nested routes.
 * - While auth is resolving, renders a safe loading state (no content flash).
 * - Anonymous visitors are redirected to login with a same-origin return URL.
 * - Authenticated users without an allowed role get the Forbidden page.
 * - Allowed users see the nested route via <Outlet />.
 */
export function RequireRole({ allow }: RequireRoleProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return <GuardPending />;
  }
  if (auth.status !== 'authenticated') {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    const params = new URLSearchParams();
    params.set('return', returnPath);
    return <Navigate to={`/auth/login?${params.toString()}`} replace />;
  }
  if (!hasAnyRole(auth.user?.roles, allow)) {
    return <ForbiddenPage />;
  }
  return <Outlet />;
}

function GuardPending() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center p-8"
    >
      <span className="inline-flex items-center gap-3 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        <span>{t('guard.loading')}</span>
      </span>
    </div>
  );
}

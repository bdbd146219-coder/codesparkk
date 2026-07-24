import { Outlet } from 'react-router-dom';
import { StaffSidebar, StaffTopBar } from '@/components/navigation';

/**
 * Productivity shell shared by instructor / admin / super-admin. Sidebar +
 * top bar layout. Role-based nav filtering kicks in once auth resolves a
 * current role in Phase B; until then the full nav is visible.
 *
 * The Parent dashboard is intentionally a separate future shell — see
 * `docs/frontend-architecture.md` for the architectural rationale.
 */
export function StaffShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <StaffSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopBar />
        <main id="main" className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

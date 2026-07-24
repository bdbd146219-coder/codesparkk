import { Outlet } from 'react-router-dom';
import { StudentTopBar } from '@/components/navigation';

/**
 * Student shell. Hosts the kid-facing experience: dashboard, learning,
 * assignments, projects, coding practice, achievements. The age-band theme
 * (Junior 6-9 / Explorer 10-16) is set globally via the ThemeSwitcher;
 * features inside this shell may also call `useAgeBand()` (added in a
 * later phase) when their *content* needs to vary by band.
 */
export function StudentShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <StudentTopBar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

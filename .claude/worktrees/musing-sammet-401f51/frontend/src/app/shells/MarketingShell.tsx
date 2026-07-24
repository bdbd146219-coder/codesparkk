import { Outlet } from 'react-router-dom';
import { MarketingFooter, MarketingHeader } from '@/components/navigation';

/**
 * Public-facing shell. Hosts marketing pages (Home, Courses, Learning Paths,
 * About, FAQ, Contact). Anonymous traffic lives here.
 */
export function MarketingShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <MarketingHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}

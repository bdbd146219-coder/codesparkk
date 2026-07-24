import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { BrandLockup, MobileNavSheet, NavLinkButton } from '@/components/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { parentNav } from '@/lib/navigation/parent-config';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * ParentShell — the 4th shell, sibling to Marketing/Student/Staff. Sidebar +
 * top bar layout sized for the future Parent Dashboard (children overview,
 * progress, attendance, payments, reports, notifications). Today only the
 * placeholder dashboard renders inside it; nav items are mostly disabled.
 */
export function ParentShell() {
  const { t } = useTranslation();
  const auth = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('skip.toMain')}
      </a>

      {/* Desktop sidebar */}
      <aside
        aria-label={t('nav.parent.primaryLabel')}
        className="hidden h-screen w-64 shrink-0 border-e border-border bg-surface/60 md:sticky md:top-0 md:flex md:flex-col"
      >
        <div className="flex h-16 items-center border-b border-border px-4">
          <BrandLockup />
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-4">
            {parentNav.primary.map((group, gIndex) => (
              <li key={gIndex} className="space-y-1">
                {group.i18nKey ? (
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(group.i18nKey)}
                  </div>
                ) : null}
                <ul className="space-y-1">
                  {group.items.map((item, iIndex) => (
                    <li key={iIndex}>
                      <NavLinkButton item={item} variant="sidebar" />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
        {auth.status === 'authenticated' ? (
          <div className="border-t border-border p-3 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">
              {auth.user?.displayName || t('parent.home.fallbackName')}
            </p>
            <p className="truncate">{auth.user?.email}</p>
          </div>
        ) : null}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <MobileNavSheet
                config={parentNav}
                ariaDescriptionKey="nav.parent.mobileDescription"
                footerSlot={
                  <>
                    <ThemeSwitcher />
                    <LanguageSwitcher />
                  </>
                }
              />
              <span className="md:hidden">
                <BrandLockup />
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeSwitcher className="hidden sm:inline-flex" />
              <LanguageSwitcher className="hidden sm:inline-flex" />
              <Button
                variant="ghost"
                size="icon"
                disabled
                aria-label={t('nav.parent.notificationsLabel')}
              >
                <Bell aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>
        <main id="main" className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

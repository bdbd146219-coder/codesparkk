import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { BrandLockup } from '@/components/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

/**
 * Quiet, parent-facing shell for the authentication flow. Brand lockup
 * sits at the top-start, language + theme switchers at the top-end, and
 * the active page renders inside a centered max-w-md card. Footer reminds
 * parents that the platform is encrypted, parent-managed, and never sells
 * data — the trust signal is intentional copy, not decoration.
 */
export function AuthShell() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t('skip.toMain')}
      </a>

      <header className="border-b border-border bg-surface/40">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLockup />
          <div className="flex items-center gap-1.5">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main
        id="main"
        className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-14"
      >
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-border bg-surface/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-start">
          <p className="inline-flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            <span>{t('auth.trust.secure')}</span>
          </p>
          <ul className="flex items-center gap-4">
            <li>
              <a
                href="#"
                className="underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('auth.trust.privacy')}
              </a>
            </li>
            <li>
              <a
                href="#"
                className="underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('auth.trust.terms')}
              </a>
            </li>
            <li>
              <a
                href="#"
                className="underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('auth.trust.support')}
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

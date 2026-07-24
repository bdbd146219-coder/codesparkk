import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AuthCardProps {
  /** i18n key for the heading (h1). */
  titleKey: string;
  /** Optional i18n key for the short description below the heading. */
  descriptionKey?: string;
  /** Small text shown above the title — e.g. "Welcome back". */
  kickerKey?: string;
  children: ReactNode;
  /** Optional footer slot (already rendered nodes, not an i18n key). */
  footer?: ReactNode;
}

/**
 * Shared layout for the auth pages. Renders inside `AuthShell`'s centered
 * card slot. Sized for a comfortable single-column form; never wider than
 * the parent's `max-w-md`.
 */
export function AuthCard({ titleKey, descriptionKey, kickerKey, children, footer }: AuthCardProps) {
  const { t } = useTranslation();
  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-md sm:p-8">
      <header className="mb-6 space-y-2">
        {kickerKey ? (
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{t(kickerKey)}</p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t(titleKey)}
        </h1>
        {descriptionKey ? (
          <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
        ) : null}
      </header>
      {children}
      {footer ? (
        <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

import { useTranslation } from 'react-i18next';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Optimistic-concurrency conflict banner (C2E foundation). Shown when a 409
 * tells us another admin changed the course since it was loaded. Offers a
 * reload of the latest server copy — never an auto-retry or overwrite. Wired to
 * real mutations in the course update task; here it is exercised via the dev
 * `?state=conflict` fixture.
 */
export function ConcurrencyAlert({ onReload }: { onReload?: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
          <TriangleAlert aria-hidden="true" className="size-4" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            {t('staff.catalog.courses.detail.concurrency.title')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('staff.catalog.courses.detail.concurrency.body')}
          </p>
        </div>
      </div>
      {onReload ? (
        <Button variant="outline" size="sm" onClick={onReload} className="self-start sm:self-auto">
          <RefreshCw aria-hidden="true" />
          {t('staff.catalog.courses.detail.concurrency.reload')}
        </Button>
      ) : null}
    </div>
  );
}

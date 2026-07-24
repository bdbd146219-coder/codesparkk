import { useTranslation } from 'react-i18next';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Optimistic-concurrency conflict banner (C2E foundation). Shown when a 409
 * tells us another admin changed the record since it was loaded. Offers a
 * reload of the latest server copy — never an auto-retry or overwrite. The copy
 * defaults to the course wording but is overridable so other admin catalog
 * screens (e.g. categories) can reuse the same component with their own text.
 */
export function ConcurrencyAlert({
  onReload,
  titleKey = 'staff.catalog.courses.detail.concurrency.title',
  bodyKey = 'staff.catalog.courses.detail.concurrency.body',
  reloadKey = 'staff.catalog.courses.detail.concurrency.reload',
}: {
  onReload?: () => void;
  titleKey?: string;
  bodyKey?: string;
  reloadKey?: string;
}) {
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
          <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
          <p className="text-sm text-muted-foreground">{t(bodyKey)}</p>
        </div>
      </div>
      {onReload ? (
        <Button variant="outline" size="sm" onClick={onReload} className="self-start sm:self-auto">
          <RefreshCw aria-hidden="true" />
          {t(reloadKey)}
        </Button>
      ) : null}
    </div>
  );
}

import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatalogImage } from '@/components/catalog';

/**
 * Presentational atoms shared by the public browse pages: the card media tile, a
 * category chip, a loading skeleton grid, and the empty / error result panels.
 * `CatalogCardMedia` delegates to the shared `CatalogImage`, which renders a real
 * `<img>` once a media host is configured (`VITE_MEDIA_BASE_URL`) and otherwise
 * the branded Code Spark Kids blue fallback tile — never a broken image (C4E).
 */

/** Card cover media — a real image when resolvable, else the branded fallback. */
export function CatalogCardMedia({
  icon,
  mediaKey,
  alt,
  kind,
}: {
  icon: LucideIcon;
  mediaKey?: string | null;
  alt?: string | null;
  kind: 'course' | 'path';
}) {
  return (
    <CatalogImage
      icon={icon}
      mediaKey={mediaKey}
      alt={alt}
      kind={kind}
      className="aspect-[16/9] rounded-t-2xl"
      iconClassName="size-10"
    />
  );
}

/** A pill for a category filter chip (toggles active/selected styling). */
export function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5',
      ].join(' ')}
    >
      <span dir="auto">{label}</span>
      {typeof count === 'number' ? (
        <span
          className={[
            'rounded-full px-1.5 text-xs tabular-nums',
            active ? 'bg-primary-foreground/20' : 'bg-secondary text-muted-foreground',
          ].join(' ')}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Skeleton grid shown while a browse page loads (matches the card grid shape). */
export function CatalogSkeletonGrid({ count = 6 }: { count?: number }) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('catalog.common.loading')}</span>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="aspect-[16/9] animate-pulse bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Friendly empty state — distinguishes "no matches for filters" from "no content yet". */
export function CatalogEmptyState({
  filtered,
  base,
  onClear,
}: {
  filtered: boolean;
  base: string;
  onClear?: () => void;
}) {
  const { t } = useTranslation();
  const key = filtered ? 'filtered' : 'none';
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <SearchX aria-hidden="true" className="size-7" />
      </span>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">{t(`${base}.empty.${key}.title`)}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t(`${base}.empty.${key}.body`)}
        </p>
      </div>
      {filtered && onClear ? (
        <Button variant="outline" onClick={onClear}>
          {t(`${base}.clearFilters`)}
        </Button>
      ) : null}
    </div>
  );
}

/** Error panel with a retry action and a safe, localized message. */
export function CatalogErrorState({
  base,
  messageKey,
  onRetry,
}: {
  base: string;
  messageKey: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center"
    >
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" className="size-7" />
      </span>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">{t(`${base}.error.title`)}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{t(messageKey)}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        {t(`${base}.error.retry`)}
      </Button>
    </div>
  );
}

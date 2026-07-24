import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Layers, Waypoints } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CatalogPathCard } from '@/lib/api/catalog';
import { ageBandLabelKey } from '../shared';
import { CatalogCardMedia } from './CatalogStates';

/**
 * Public learning-path card. A learning path bundles courses into a guided
 * journey; the card shows title, summary, age band, and the course count, and
 * is fully clickable via a stretched CTA link to `/catalog/learning-paths/:slug`.
 */
export function PublicLearningPathCard({ path }: { path: CatalogPathCard }) {
  const { t } = useTranslation();
  const title = path.title?.trim() || path.slug || '—';
  const to = `/catalog/learning-paths/${path.slug ?? ''}`;
  const count = path.courseCount ?? 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-fast focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CatalogCardMedia
        icon={Waypoints}
        mediaKey={path.thumbnailKey}
        alt={path.thumbnailAlt}
        kind="path"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-medium">
            {t('catalog.learningPaths.card.badge')}
          </Badge>
          <Badge variant="outline">{t(ageBandLabelKey(path.ageBand))}</Badge>
        </div>

        <div className="space-y-1.5">
          <h3
            className="font-display text-lg font-semibold leading-snug text-foreground"
            dir="auto"
          >
            <Link to={to} className="outline-none after:absolute after:inset-0 after:content-['']">
              {title}
            </Link>
          </h3>
          {path.summary?.trim() ? (
            <p className="line-clamp-2 text-sm text-muted-foreground" dir="auto">
              {path.summary}
            </p>
          ) : null}
        </div>

        <p className="mt-auto inline-flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <Layers aria-hidden="true" className="size-3.5" />
          {t('catalog.learningPaths.card.courses', { count })}
        </p>

        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          {t('catalog.learningPaths.card.cta')}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </p>
      </div>
    </article>
  );
}

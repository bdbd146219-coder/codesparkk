import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CatalogCourseCard } from '@/lib/api/catalog';
import { ageBandLabelKey, deliveryLabelKey, difficultyLabelKey } from '../shared';
import { CatalogCardMedia } from './CatalogStates';

/**
 * Public course card. Renders only fields the catalog DTO exposes; the whole
 * card is clickable via a stretched CTA link (one accessible link, full-card hit
 * area) to `/catalog/courses/:slug`.
 */
export function PublicCourseCard({ course }: { course: CatalogCourseCard }) {
  const { t } = useTranslation();
  const title = course.title?.trim() || course.slug || '—';
  const to = `/catalog/courses/${course.slug ?? ''}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-fast focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CatalogCardMedia
        icon={BookOpen}
        mediaKey={course.thumbnailKey}
        alt={course.thumbnailAlt}
        kind="course"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {course.category?.name ? (
            <Badge variant="secondary" className="font-medium">
              <span dir="auto">{course.category.name}</span>
            </Badge>
          ) : null}
          <Badge variant="outline">{t(ageBandLabelKey(course.ageBand))}</Badge>
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
          {course.summary?.trim() ? (
            <p className="line-clamp-2 text-sm text-muted-foreground" dir="auto">
              {course.summary}
            </p>
          ) : null}
        </div>

        <dl className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" className="size-3.5" />
            <dt className="sr-only">{t('catalog.courses.card.ages')}</dt>
            <dd>
              {t('catalog.courses.card.ages')}{' '}
              <bdi>
                {course.minAge}–{course.maxAge}
              </bdi>
            </dd>
          </div>
          <div>
            <dt className="sr-only">{t('catalog.courses.card.level')}</dt>
            <dd>{t(difficultyLabelKey(course.difficulty))}</dd>
          </div>
          <div>
            <dt className="sr-only">{t('catalog.courses.card.delivery')}</dt>
            <dd>{t(deliveryLabelKey(course.deliveryType))}</dd>
          </div>
        </dl>

        <p className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-primary">
          {t('catalog.courses.card.cta')}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </p>
      </div>
    </article>
  );
}

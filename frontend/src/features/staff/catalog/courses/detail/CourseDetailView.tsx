import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, SearchX } from 'lucide-react';
import { Breadcrumbs, Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { detailTitle, type CourseDetailViewModel } from './detail-helpers';
import { CourseEditor, type CourseEditorDemo } from './edit/CourseEditor';

export interface CourseDetailViewProps {
  vm: CourseDetailViewModel;
  onRetry: () => void;
  onReloadLatest?: () => void;
  /** Dev-only editor display overrides for visual QA. */
  demo?: CourseEditorDemo;
}

export function CourseDetailView({ vm, onRetry, onReloadLatest, demo }: CourseDetailViewProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const lastCrumb =
    vm.status === 'data'
      ? { label: detailTitle(vm.course, lang) }
      : { label: t('staff.catalog.courses.detail.crumb') };

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/10 via-background to-background">
      <Container size="xl" padded>
        <div className="space-y-6 py-6">
          <Breadcrumbs
            items={[
              { label: t('staff.home.crumbHome'), to: '/staff' },
              { label: t('staff.catalog.courses.title'), to: '/staff/courses' },
              lastCrumb,
            ]}
          />

          {vm.status === 'loading' ? <CourseDetailSkeleton /> : null}

          {vm.status === 'error' ? (
            <StatusPanel
              icon={<AlertTriangle aria-hidden="true" className="size-6" />}
              tone="error"
              title={t('staff.catalog.courses.detail.error.title')}
              body={t(vm.messageKey)}
              onRetry={onRetry}
            />
          ) : null}

          {vm.status === 'notfound' ? (
            <StatusPanel
              icon={<SearchX aria-hidden="true" className="size-6" />}
              tone="muted"
              title={t('staff.catalog.courses.detail.notFound.title')}
              body={t('staff.catalog.courses.detail.notFound.body')}
            />
          ) : null}

          {vm.status === 'data' ? (
            <CourseEditor
              course={vm.course}
              onReloadLatest={onReloadLatest ?? (() => {})}
              demo={demo}
            />
          ) : null}
        </div>
      </Container>
    </div>
  );
}

function StatusPanel({
  icon,
  tone,
  title,
  body,
  onRetry,
}: {
  icon: ReactNode;
  tone: 'error' | 'muted';
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const toneClass =
    tone === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-surface/60';
  const iconClass =
    tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground';

  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center shadow-sm ${toneClass}`}
    >
      <span className={`inline-flex size-12 items-center justify-center rounded-full ${iconClass}`}>
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            {t('staff.catalog.courses.detail.error.retry')}
          </Button>
        ) : null}
        <Button asChild variant={onRetry ? 'ghost' : 'outline'}>
          <Link to="/staff/courses">
            <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
            {t('staff.catalog.courses.detail.backToCourses')}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CourseDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">{t('staff.catalog.courses.detail.loading')}</span>
      <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 w-20 animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

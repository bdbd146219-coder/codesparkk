import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  SearchX,
} from 'lucide-react';
import { Breadcrumbs, Container, EmptyState, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CourseFilters } from './CourseFilters';
import { CourseCardList } from './CourseCard';
import { CoursesTable } from './CoursesTable';
import type { CategoryOption, CoursesViewModel } from './format';
import type { CourseFilterController } from './use-course-filters';

export interface CoursesListViewProps {
  fc: CourseFilterController;
  categoryOptions: CategoryOption[];
  vm: CoursesViewModel;
  isFetching: boolean;
  onRetry: () => void;
}

export function CoursesListView({
  fc,
  categoryOptions,
  vm,
  isFetching,
  onRetry,
}: CoursesListViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/10 via-background to-background">
      <Container size="xl" padded>
        <div className="space-y-6 py-6">
          <Breadcrumbs
            items={[
              { label: t('staff.home.crumbHome'), to: '/staff' },
              { label: t('staff.catalog.courses.title') },
            ]}
          />
          <PageHeader
            kicker={t('staff.catalog.kicker')}
            title={t('staff.catalog.courses.title')}
            description={t('staff.catalog.courses.lead')}
            actions={
              <Button asChild>
                <Link to="/staff/courses/new">
                  <Plus aria-hidden="true" />
                  {t('staff.catalog.courses.list.actions.newCourse')}
                </Link>
              </Button>
            }
          />

          <CourseFilters fc={fc} categoryOptions={categoryOptions} />

          {vm.status === 'data' ? (
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p aria-live="polite">
                {t('staff.catalog.courses.list.results', { count: vm.totalItems })}
              </p>
              {isFetching ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                  {t('staff.catalog.courses.list.updating')}
                </span>
              ) : null}
            </div>
          ) : null}

          <Results vm={vm} fc={fc} onRetry={onRetry} isFetching={isFetching} />
        </div>
      </Container>
    </div>
  );
}

function Results({
  vm,
  fc,
  onRetry,
  isFetching,
}: {
  vm: CoursesViewModel;
  fc: CourseFilterController;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const { t } = useTranslation();

  if (vm.status === 'loading') return <CoursesSkeleton />;

  if (vm.status === 'error') {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      >
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            {t('staff.catalog.courses.list.error.title')}
          </p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{t(vm.messageKey)}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          {t('staff.catalog.courses.list.error.retry')}
        </Button>
      </div>
    );
  }

  if (vm.status === 'empty') {
    return vm.filtered ? (
      <EmptyState
        icon={SearchX}
        title={t('staff.catalog.courses.list.empty.filtered.title')}
        description={t('staff.catalog.courses.list.empty.filtered.body')}
        action={
          <Button variant="outline" onClick={fc.clear}>
            {t('staff.catalog.courses.list.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={BookOpen}
        title={t('staff.catalog.courses.list.empty.none.title')}
        description={t('staff.catalog.courses.list.empty.none.body')}
        action={
          <Button asChild>
            <Link to="/staff/courses/new">
              <Plus aria-hidden="true" />
              {t('staff.catalog.courses.list.actions.newCourse')}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className={cn('space-y-4 transition-opacity', isFetching && 'opacity-60')}>
      <CoursesTable items={vm.items} />
      <CourseCardList items={vm.items} />
      <CoursesPagination page={vm.page} totalPages={vm.totalPages} onPageChange={fc.setPage} />
    </div>
  );
}

function CoursesPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={t('staff.catalog.courses.list.pagination.label')}
      className="flex items-center justify-between gap-3"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
        {t('staff.catalog.courses.list.pagination.previous')}
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {t('staff.catalog.courses.list.pagination.pageOf', { page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t('staff.catalog.courses.list.pagination.next')}
        <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
      </Button>
    </nav>
  );
}

function CoursesSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{t('staff.catalog.courses.list.loading')}</span>
      <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="ms-auto h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border p-4">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-8 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

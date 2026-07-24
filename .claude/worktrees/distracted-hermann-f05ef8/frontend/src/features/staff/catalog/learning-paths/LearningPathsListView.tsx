import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  SearchX,
  Waypoints,
} from 'lucide-react';
import { Breadcrumbs, Container, EmptyState, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LearningPathFilters } from './LearningPathFilters';
import { LearningPathsTable } from './LearningPathsTable';
import { LearningPathCardList } from './LearningPathCard';
import type { LearningPathsViewModel } from './format';
import type { LearningPathFilterController } from './use-learning-path-filters';

export interface LearningPathsListViewProps {
  fc: LearningPathFilterController;
  vm: LearningPathsViewModel;
  isFetching: boolean;
  onRetry: () => void;
}

/** Opens the create page (C3G). */
function NewPathAction() {
  const { t } = useTranslation();
  return (
    <Button asChild>
      <Link to="/staff/learning-paths/new">
        <Plus aria-hidden="true" />
        {t('staff.catalog.learningPaths.list.actions.newPath')}
      </Link>
    </Button>
  );
}

export function LearningPathsListView({ fc, vm, isFetching, onRetry }: LearningPathsListViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/10 via-background to-background">
      <Container size="xl" padded>
        <div className="space-y-6 py-6">
          <Breadcrumbs
            items={[
              { label: t('staff.home.crumbHome'), to: '/staff' },
              { label: t('staff.catalog.learningPaths.title') },
            ]}
          />
          <PageHeader
            kicker={t('staff.catalog.kicker')}
            title={t('staff.catalog.learningPaths.title')}
            description={t('staff.catalog.learningPaths.lead')}
            actions={<NewPathAction />}
          />

          <LearningPathFilters fc={fc} />

          {vm.status === 'data' ? (
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p aria-live="polite">
                {t('staff.catalog.learningPaths.list.results', { count: vm.totalItems })}
              </p>
              {isFetching ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                  {t('staff.catalog.learningPaths.list.updating')}
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
  vm: LearningPathsViewModel;
  fc: LearningPathFilterController;
  onRetry: () => void;
  isFetching: boolean;
}) {
  const { t } = useTranslation();

  if (vm.status === 'loading') return <PathsSkeleton />;

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
            {t('staff.catalog.learningPaths.list.error.title')}
          </p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{t(vm.messageKey)}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          {t('staff.catalog.learningPaths.list.error.retry')}
        </Button>
      </div>
    );
  }

  if (vm.status === 'empty') {
    return vm.filtered ? (
      <EmptyState
        icon={SearchX}
        title={t('staff.catalog.learningPaths.list.empty.filtered.title')}
        description={t('staff.catalog.learningPaths.list.empty.filtered.body')}
        action={
          <Button variant="outline" onClick={fc.clear}>
            {t('staff.catalog.learningPaths.list.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Waypoints}
        title={t('staff.catalog.learningPaths.list.empty.none.title')}
        description={t('staff.catalog.learningPaths.list.empty.none.body')}
        action={<NewPathAction />}
      />
    );
  }

  return (
    <div className={cn('space-y-4 transition-opacity', isFetching && 'opacity-60')}>
      <LearningPathsTable items={vm.items} />
      <LearningPathCardList items={vm.items} />
      <PathsPagination page={vm.page} totalPages={vm.totalPages} onPageChange={fc.setPage} />
    </div>
  );
}

function PathsPagination({
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
      aria-label={t('staff.catalog.learningPaths.list.pagination.label')}
      className="flex items-center justify-between gap-3"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
        {t('staff.catalog.learningPaths.list.pagination.previous')}
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {t('staff.catalog.learningPaths.list.pagination.pageOf', { page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t('staff.catalog.learningPaths.list.pagination.next')}
        <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
      </Button>
    </nav>
  );
}

function PathsSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{t('staff.catalog.learningPaths.list.loading')}</span>
      <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="ms-auto h-8 w-24 animate-pulse rounded bg-muted" />
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
            </div>
            <div className="h-8 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

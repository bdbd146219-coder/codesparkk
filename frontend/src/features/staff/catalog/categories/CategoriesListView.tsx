import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Loader2,
  Plus,
  SearchX,
} from 'lucide-react';
import { Breadcrumbs, Container, EmptyState, PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminCategoryDetail } from '@/lib/api/admin/categories';
import { ConcurrencyAlert } from '../courses/ConcurrencyAlert';
import { CategoryFilters } from './CategoryFilters';
import { CategoriesTable } from './CategoriesTable';
import { CategoryCardList } from './CategoryCard';
import { CategoryFormDialog, type CategoryFormResult } from './CategoryFormDialog';
import { StatusChangeDialog } from './StatusChangeDialog';
import type { CategoriesViewModel, CategoryListItem } from './format';
import type { CategoryFilterController } from './use-category-filters';

type FeedbackKey = 'created' | 'updated' | 'activated' | 'deactivated';

/** Dev-only overrides that force dialog/banner states for visual QA. */
export interface CategoriesViewDemo {
  dialog?: 'create' | 'createInvalid' | 'edit' | 'editConflict' | 'deactivate' | 'activate';
  feedback?: FeedbackKey;
  conflict?: boolean;
  editCategory?: CategoryListItem;
  editDetail?: AdminCategoryDetail;
}

export interface CategoriesListViewProps {
  fc: CategoryFilterController;
  vm: CategoriesViewModel;
  isFetching: boolean;
  onRetry: () => void;
  demo?: CategoriesViewDemo;
}

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; category: CategoryListItem }
  | { kind: 'status'; category: CategoryListItem }
  | null;

export function CategoriesListView({ fc, vm, isFetching, onRetry, demo }: CategoriesListViewProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [dialog, setDialog] = useState<DialogState>(null);
  const [feedback, setFeedback] = useState<FeedbackKey | null>(null);
  const [conflict, setConflict] = useState(false);

  const openCreate = () => {
    setFeedback(null);
    setConflict(false);
    setDialog({ kind: 'create' });
  };
  const openEdit = (category: CategoryListItem) => {
    setFeedback(null);
    setConflict(false);
    setDialog({ kind: 'edit', category });
  };
  const openStatus = (category: CategoryListItem) => {
    setFeedback(null);
    setConflict(false);
    setDialog({ kind: 'status', category });
  };
  const closeDialog = () => setDialog(null);

  const onFormDone = (result: CategoryFormResult) => {
    setDialog(null);
    setFeedback(result);
  };
  const onStatusDone = (action: 'activated' | 'deactivated') => {
    setDialog(null);
    setFeedback(action);
  };
  const onStatusConflict = () => {
    setDialog(null);
    setConflict(true);
    onRetry();
  };

  const activeFeedback = demo?.feedback ?? feedback;
  const showConflict = demo?.conflict ?? conflict;

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/10 via-background to-background">
      <Container size="xl" padded>
        <div className="space-y-6 py-6">
          <Breadcrumbs
            items={[
              { label: t('staff.home.crumbHome'), to: '/staff' },
              { label: t('staff.catalog.categories.title') },
            ]}
          />
          <PageHeader
            kicker={t('staff.catalog.kicker')}
            title={t('staff.catalog.categories.title')}
            description={t('staff.catalog.categories.lead')}
            actions={
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" />
                {t('staff.catalog.categories.list.actions.newCategory')}
              </Button>
            }
          />

          {activeFeedback ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground"
            >
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
              {t(`staff.catalog.categories.feedback.${activeFeedback}`)}
            </div>
          ) : null}

          {showConflict ? (
            <ConcurrencyAlert
              titleKey="staff.catalog.categories.concurrency.title"
              bodyKey="staff.catalog.categories.concurrency.body"
              reloadKey="staff.catalog.categories.concurrency.reload"
              onReload={() => {
                setConflict(false);
                onRetry();
              }}
            />
          ) : null}

          <CategoryFilters fc={fc} />

          {vm.status === 'data' ? (
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p aria-live="polite">
                {t('staff.catalog.categories.list.results', { count: vm.totalItems })}
              </p>
              {isFetching ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                  {t('staff.catalog.categories.list.updating')}
                </span>
              ) : null}
            </div>
          ) : null}

          <Results
            vm={vm}
            fc={fc}
            onRetry={onRetry}
            isFetching={isFetching}
            onNew={openCreate}
            onEdit={openEdit}
            onToggleActive={openStatus}
          />
        </div>
      </Container>

      <Dialogs
        dialog={dialog}
        demo={demo}
        lang={lang}
        onClose={closeDialog}
        onFormDone={onFormDone}
        onStatusDone={onStatusDone}
        onStatusConflict={onStatusConflict}
      />
    </div>
  );
}

function Dialogs({
  dialog,
  demo,
  lang,
  onClose,
  onFormDone,
  onStatusDone,
  onStatusConflict,
}: {
  dialog: DialogState;
  demo?: CategoriesViewDemo;
  lang: string;
  onClose: () => void;
  onFormDone: (result: CategoryFormResult) => void;
  onStatusDone: (action: 'activated' | 'deactivated') => void;
  onStatusConflict: () => void;
}) {
  // Dev demo forces a specific dialog open with fixtures; live path uses state.
  if (demo?.dialog) {
    switch (demo.dialog) {
      case 'create':
        return (
          <CategoryFormDialog mode="create" onDone={onFormDone} onCancel={onClose} demo={{}} />
        );
      case 'createInvalid':
        return (
          <CategoryFormDialog
            mode="create"
            onDone={onFormDone}
            onCancel={onClose}
            demo={{ invalid: true }}
          />
        );
      case 'edit':
        return (
          <CategoryFormDialog
            mode="edit"
            category={demo.editCategory}
            onDone={onFormDone}
            onCancel={onClose}
            demo={{ detail: demo.editDetail }}
          />
        );
      case 'editConflict':
        return (
          <CategoryFormDialog
            mode="edit"
            category={demo.editCategory}
            onDone={onFormDone}
            onCancel={onClose}
            demo={{ detail: demo.editDetail, conflict: true }}
          />
        );
      case 'deactivate':
      case 'activate':
        if (!demo.editCategory) return null;
        return (
          <StatusChangeDialog
            category={demo.editCategory}
            lang={lang}
            onDone={onStatusDone}
            onConflict={onStatusConflict}
            onCancel={onClose}
          />
        );
    }
  }

  if (!dialog) return null;
  if (dialog.kind === 'create') {
    return <CategoryFormDialog mode="create" onDone={onFormDone} onCancel={onClose} />;
  }
  if (dialog.kind === 'edit') {
    return (
      <CategoryFormDialog
        mode="edit"
        category={dialog.category}
        onDone={onFormDone}
        onCancel={onClose}
      />
    );
  }
  return (
    <StatusChangeDialog
      category={dialog.category}
      lang={lang}
      onDone={onStatusDone}
      onConflict={onStatusConflict}
      onCancel={onClose}
    />
  );
}

function Results({
  vm,
  fc,
  onRetry,
  isFetching,
  onNew,
  onEdit,
  onToggleActive,
}: {
  vm: CategoriesViewModel;
  fc: CategoryFilterController;
  onRetry: () => void;
  isFetching: boolean;
  onNew: () => void;
  onEdit: (category: CategoryListItem) => void;
  onToggleActive: (category: CategoryListItem) => void;
}) {
  const { t } = useTranslation();

  if (vm.status === 'loading') return <CategoriesSkeleton />;

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
            {t('staff.catalog.categories.list.error.title')}
          </p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{t(vm.messageKey)}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          {t('staff.catalog.categories.list.error.retry')}
        </Button>
      </div>
    );
  }

  if (vm.status === 'empty') {
    return vm.filtered ? (
      <EmptyState
        icon={SearchX}
        title={t('staff.catalog.categories.list.empty.filtered.title')}
        description={t('staff.catalog.categories.list.empty.filtered.body')}
        action={
          <Button variant="outline" onClick={fc.clear}>
            {t('staff.catalog.categories.list.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={FolderTree}
        title={t('staff.catalog.categories.list.empty.none.title')}
        description={t('staff.catalog.categories.list.empty.none.body')}
        action={
          <Button onClick={onNew}>
            <Plus aria-hidden="true" />
            {t('staff.catalog.categories.list.actions.newCategory')}
          </Button>
        }
      />
    );
  }

  return (
    <div className={cn('space-y-4 transition-opacity', isFetching && 'opacity-60')}>
      <CategoriesTable items={vm.items} onEdit={onEdit} onToggleActive={onToggleActive} />
      <CategoryCardList items={vm.items} onEdit={onEdit} onToggleActive={onToggleActive} />
      <CategoriesPagination page={vm.page} totalPages={vm.totalPages} onPageChange={fc.setPage} />
    </div>
  );
}

function CategoriesPagination({
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
      aria-label={t('staff.catalog.categories.list.pagination.label')}
      className="flex items-center justify-between gap-3"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
        {t('staff.catalog.categories.list.pagination.previous')}
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {t('staff.catalog.categories.list.pagination.pageOf', { page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t('staff.catalog.categories.list.pagination.next')}
        <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
      </Button>
    </nav>
  );
}

function CategoriesSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{t('staff.catalog.categories.list.loading')}</span>
      <div className="hidden overflow-hidden rounded-lg border border-border lg:block">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="ms-auto h-8 w-32 animate-pulse rounded bg-muted" />
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

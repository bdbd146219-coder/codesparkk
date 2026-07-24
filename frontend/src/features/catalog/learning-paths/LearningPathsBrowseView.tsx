import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Container } from '@/components/layout';
import { Label } from '@/components/ui/label';
import type { CatalogPathCard } from '@/lib/api/catalog';
import { CatalogHero } from '../components/CatalogHero';
import {
  CatalogEmptyState,
  CatalogErrorState,
  CatalogSkeletonGrid,
} from '../components/CatalogStates';
import { CatalogPagination } from '../components/CatalogPagination';
import { PublicLearningPathCard } from '../components/PublicLearningPathCard';
import type { CatalogViewModel } from '../shared';
import type { PathCatalogFilterController } from './path-catalog-filters';

const KEY = 'catalog.learningPaths';
const AGE_BANDS = ['Junior', 'Explorer'] as const;

export interface LearningPathsBrowseViewProps {
  fc: PathCatalogFilterController;
  vm: CatalogViewModel<CatalogPathCard>;
  isFetching: boolean;
  onRetry: () => void;
}

export function LearningPathsBrowseView({
  fc,
  vm,
  isFetching,
  onRetry,
}: LearningPathsBrowseViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/5 via-background to-background">
      <CatalogHero kicker={t(`${KEY}.kicker`)} title={t(`${KEY}.title`)} lead={t(`${KEY}.lead`)} />

      <Container size="lg" padded>
        <div className="space-y-6 py-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/70 p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
            <div className="space-y-1.5">
              <Label htmlFor="catalog-path-age">{t(`${KEY}.filters.ageBand`)}</Label>
              <select
                id="catalog-path-age"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-56"
                value={fc.values.ageBand}
                onChange={(e) => fc.setValues({ ageBand: e.target.value })}
              >
                <option value="">{t(`${KEY}.filters.allAges`)}</option>
                {AGE_BANDS.map((v) => (
                  <option key={v} value={v}>
                    {t(`staff.catalog.enums.ageBand.${v}`)}
                  </option>
                ))}
              </select>
            </div>
            {vm.status === 'data' ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {t(`${KEY}.results`, { count: vm.totalItems })}
              </p>
            ) : null}
          </div>

          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary/70" />
            <span>{t(`${KEY}.filters.note`)}</span>
          </p>

          {vm.status === 'loading' ? <CatalogSkeletonGrid /> : null}
          {vm.status === 'error' ? (
            <CatalogErrorState base={KEY} messageKey={vm.messageKey} onRetry={onRetry} />
          ) : null}
          {vm.status === 'empty' ? (
            <CatalogEmptyState base={KEY} filtered={vm.filtered} onClear={fc.clear} />
          ) : null}

          {vm.status === 'data' ? (
            <>
              <div
                className={[
                  'grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3',
                  isFetching ? 'opacity-60' : '',
                ].join(' ')}
              >
                {vm.items.map((path) => (
                  <PublicLearningPathCard key={path.slug} path={path} />
                ))}
              </div>
              <CatalogPagination
                base={KEY}
                page={vm.page}
                totalPages={vm.totalPages}
                onPageChange={fc.setPage}
              />
            </>
          ) : null}
        </div>
      </Container>
    </div>
  );
}

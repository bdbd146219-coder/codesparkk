import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Container } from '@/components/layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CatalogCategory, CatalogCourseCard } from '@/lib/api/catalog';
import { CatalogHero } from '../components/CatalogHero';
import {
  CatalogEmptyState,
  CatalogErrorState,
  CatalogSkeletonGrid,
  CategoryChip,
} from '../components/CatalogStates';
import { CatalogPagination } from '../components/CatalogPagination';
import { PublicCourseCard } from '../components/PublicCourseCard';
import type { CatalogViewModel } from '../shared';
import { COURSE_SORTS, type CourseCatalogFilterController } from './course-catalog-filters';

const KEY = 'catalog.courses';
const AGE_BANDS = ['Junior', 'Explorer'] as const;

export interface CoursesBrowseViewProps {
  fc: CourseCatalogFilterController;
  vm: CatalogViewModel<CatalogCourseCard>;
  categories: CatalogCategory[];
  isFetching: boolean;
  onRetry: () => void;
}

export function CoursesBrowseView({
  fc,
  vm,
  categories,
  isFetching,
  onRetry,
}: CoursesBrowseViewProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-primary/5 via-background to-background">
      <CatalogHero kicker={t(`${KEY}.kicker`)} title={t(`${KEY}.title`)} lead={t(`${KEY}.lead`)} />

      <Container size="lg" padded>
        <div className="space-y-6 py-8">
          <FilterBar fc={fc} categories={categories} />

          {vm.status === 'data' ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t(`${KEY}.results`, { count: vm.totalItems })}
            </p>
          ) : null}

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
                {vm.items.map((course) => (
                  <PublicCourseCard key={course.slug} course={course} />
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

function FilterBar({
  fc,
  categories,
}: {
  fc: CourseCatalogFilterController;
  categories: CatalogCategory[];
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface/70 p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="catalog-course-search">{t(`${KEY}.filters.searchLabel`)}</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="catalog-course-search"
              type="search"
              className="ps-9"
              placeholder={t(`${KEY}.filters.searchPlaceholder`)}
              defaultValue={fc.values.q}
              key={fc.values.q}
              onChange={(e) => fc.setValues({ q: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="catalog-course-age">{t(`${KEY}.filters.ageBand`)}</Label>
          <select
            id="catalog-course-age"
            className={SELECT_CLASS}
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

        <div className="space-y-1.5">
          <Label htmlFor="catalog-course-sort">{t(`${KEY}.filters.sort`)}</Label>
          <select
            id="catalog-course-sort"
            className={SELECT_CLASS}
            value={fc.values.sort}
            onChange={(e) =>
              fc.setValues({ sort: e.target.value as (typeof COURSE_SORTS)[number] })
            }
          >
            {COURSE_SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`${KEY}.filters.sortOptions.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {categories.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t(`${KEY}.filters.category`)}
        >
          <CategoryChip
            label={t(`${KEY}.filters.allCategories`)}
            active={fc.values.category === ''}
            onClick={() => fc.setValues({ category: '' })}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c.slug}
              label={c.name ?? c.slug ?? ''}
              count={c.publishedCourseCount ?? undefined}
              active={fc.values.category === c.slug}
              onClick={() =>
                fc.setValues({ category: c.slug === fc.values.category ? '' : (c.slug ?? '') })
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const SELECT_CLASS = [
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm sm:w-44',
  'transition-colors duration-fast',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
].join(' ');

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  AGE_BAND_VALUES,
  DELIVERY_VALUES,
  DIFFICULTY_VALUES,
  LISTED_VALUES,
  SORT_VALUES,
  STATUS_VALUES,
  type ListedFilter,
} from './filters';
import type { CategoryOption } from './format';
import type { CourseFilterController } from './use-course-filters';

const selectClass = cn(
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm',
  'transition-colors duration-fast',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

function FilterSelect({ id, label, value, onChange, children }: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {children}
      </select>
    </div>
  );
}

export interface CourseFiltersProps {
  fc: CourseFilterController;
  categoryOptions: CategoryOption[];
}

export function CourseFilters({ fc, categoryOptions }: CourseFiltersProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const allLabel = t('staff.catalog.courses.list.allOption');

  const [search, setSearch] = useState(fc.values.q ?? '');
  const debounced = useDebouncedValue(search, 350);

  // Push the debounced search term to the URL when it diverges from state.
  useEffect(() => {
    const current = fc.values.q ?? '';
    if (debounced !== current) fc.setValues({ q: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Keep the input in sync when filters are cleared/changed elsewhere.
  useEffect(() => {
    setSearch(fc.values.q ?? '');
  }, [fc.values.q]);

  return (
    <section
      aria-label={t('staff.catalog.courses.list.filtersLabel')}
      className="space-y-4 rounded-lg border border-border bg-surface/40 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <Label htmlFor="course-search" className="text-xs font-medium text-muted-foreground">
            {t('staff.catalog.courses.list.searchLabel')}
          </Label>
          <div className="relative mt-1.5">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="course-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('staff.catalog.courses.list.searchPlaceholder')}
              className="ps-9"
            />
          </div>
        </div>
        {fc.hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={fc.clear} className="self-start sm:self-auto">
            <X aria-hidden="true" />
            {t('staff.catalog.courses.list.clearFilters')}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <FilterSelect
          id="filter-status"
          label={t('staff.catalog.courses.list.filters.status')}
          value={fc.values.status ?? ''}
          onChange={(v) => fc.setValues({ status: v || undefined })}
        >
          <option value="">{allLabel}</option>
          {STATUS_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.enums.publishState.${v}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-delivery"
          label={t('staff.catalog.courses.list.filters.deliveryType')}
          value={fc.values.deliveryType ?? ''}
          onChange={(v) => fc.setValues({ deliveryType: v || undefined })}
        >
          <option value="">{allLabel}</option>
          {DELIVERY_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.enums.deliveryType.${v}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-difficulty"
          label={t('staff.catalog.courses.list.filters.difficulty')}
          value={fc.values.difficulty ?? ''}
          onChange={(v) => fc.setValues({ difficulty: v || undefined })}
        >
          <option value="">{allLabel}</option>
          {DIFFICULTY_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.enums.difficulty.${v}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-age-band"
          label={t('staff.catalog.courses.list.filters.ageBand')}
          value={fc.values.ageBand ?? ''}
          onChange={(v) => fc.setValues({ ageBand: v || undefined })}
        >
          <option value="">{allLabel}</option>
          {AGE_BAND_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.enums.ageBand.${v}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-category"
          label={t('staff.catalog.courses.list.filters.category')}
          value={fc.values.category ?? ''}
          onChange={(v) => fc.setValues({ category: v || undefined })}
        >
          <option value="">{allLabel}</option>
          {categoryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {lang.startsWith('ar') ? c.nameAr : c.nameEn}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-listed"
          label={t('staff.catalog.courses.list.filters.listed')}
          value={fc.values.listed ?? ''}
          onChange={(v) => fc.setValues({ listed: (v || undefined) as ListedFilter | undefined })}
        >
          <option value="">{allLabel}</option>
          {LISTED_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.enums.listed.${v}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="filter-sort"
          label={t('staff.catalog.courses.list.filters.sort')}
          value={fc.values.sort ?? ''}
          onChange={(v) => fc.setValues({ sort: v || undefined })}
        >
          <option value="">{t('staff.catalog.courses.list.sort.updated')}</option>
          {SORT_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.courses.list.sort.${v}`)}
            </option>
          ))}
        </FilterSelect>
      </div>
    </section>
  );
}

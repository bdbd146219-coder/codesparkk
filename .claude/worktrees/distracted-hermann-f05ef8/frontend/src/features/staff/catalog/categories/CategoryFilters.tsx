import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ACTIVE_VALUES, SORT_VALUES, type ActiveFilter } from './filters';
import type { CategoryFilterController } from './use-category-filters';

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

export function CategoryFilters({ fc }: { fc: CategoryFilterController }) {
  const { t } = useTranslation();
  const allLabel = t('staff.catalog.categories.list.allOption');

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
      aria-label={t('staff.catalog.categories.list.filtersLabel')}
      className="space-y-4 rounded-lg border border-border bg-surface/40 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <Label htmlFor="category-search" className="text-xs font-medium text-muted-foreground">
            {t('staff.catalog.categories.list.searchLabel')}
          </Label>
          <div className="relative mt-1.5">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="category-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('staff.catalog.categories.list.searchPlaceholder')}
              className="ps-9"
            />
          </div>
        </div>
        {fc.hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={fc.clear} className="self-start sm:self-auto">
            <X aria-hidden="true" />
            {t('staff.catalog.categories.list.clearFilters')}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FilterSelect
          id="category-filter-active"
          label={t('staff.catalog.categories.list.filters.status')}
          value={fc.values.active ?? ''}
          onChange={(v) => fc.setValues({ active: (v || undefined) as ActiveFilter | undefined })}
        >
          <option value="">{allLabel}</option>
          {ACTIVE_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.categories.status.${v}`)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="category-filter-sort"
          label={t('staff.catalog.categories.list.filters.sort')}
          value={fc.values.sort ?? ''}
          onChange={(v) => fc.setValues({ sort: v || undefined })}
        >
          <option value="">{t('staff.catalog.categories.list.sort.order')}</option>
          {SORT_VALUES.map((v) => (
            <option key={v} value={v}>
              {t(`staff.catalog.categories.list.sort.${v}`)}
            </option>
          ))}
        </FilterSelect>
      </div>
    </section>
  );
}

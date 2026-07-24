import { useTranslation } from 'react-i18next';
import { Power, PowerOff, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CategoryStatusBadge } from './CategoryStatusBadge';
import type { CategoryRowActions } from './CategoriesTable';
import { categoryAltName, categoryName, formatDate, type CategoryListItem } from './format';

function CategoryCard({
  category,
  onEdit,
  onToggleActive,
}: { category: CategoryListItem } & CategoryRowActions) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const name = categoryName(category, lang);
  const altName = categoryAltName(category, lang);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground" dir="auto">
              {name}
            </p>
            {altName && altName !== name ? (
              <p className="truncate text-xs text-muted-foreground" dir="auto">
                {altName}
              </p>
            ) : null}
            {category.slug ? (
              <p className="truncate text-xs text-muted-foreground">{category.slug}</p>
            ) : null}
          </div>
          <CategoryStatusBadge isActive={category.isActive} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.categories.list.columns.order')}
            </dt>
            <dd className="tabular-nums text-foreground">{category.order ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.categories.list.columns.courses')}
            </dt>
            <dd className="tabular-nums text-foreground">{category.publishedCourseCount ?? 0}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.categories.list.columns.updated')}
            </dt>
            <dd className="text-foreground">{formatDate(category.updatedAt, lang)}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:flex-1"
            onClick={() => onEdit(category)}
            aria-label={t('staff.catalog.categories.list.actions.editAria', { name })}
          >
            <Pencil aria-hidden="true" />
            {t('staff.catalog.categories.list.actions.edit')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full sm:flex-1"
            onClick={() => onToggleActive(category)}
            aria-label={t(
              category.isActive
                ? 'staff.catalog.categories.list.actions.deactivateAria'
                : 'staff.catalog.categories.list.actions.activateAria',
              { name },
            )}
          >
            {category.isActive ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
            {t(
              category.isActive
                ? 'staff.catalog.categories.list.actions.deactivate'
                : 'staff.catalog.categories.list.actions.activate',
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Mobile/tablet (below lg) category cards. Hidden at lg+, where the table renders. */
export function CategoryCardList({
  items,
  onEdit,
  onToggleActive,
}: { items: CategoryListItem[] } & CategoryRowActions) {
  return (
    <ul className="space-y-3 lg:hidden">
      {items.map((category) => (
        <li key={category.id}>
          <CategoryCard category={category} onEdit={onEdit} onToggleActive={onToggleActive} />
        </li>
      ))}
    </ul>
  );
}

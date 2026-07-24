import { useTranslation } from 'react-i18next';
import { Power, PowerOff, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryStatusBadge } from './CategoryStatusBadge';
import { categoryAltName, categoryName, formatDate, type CategoryListItem } from './format';

const TH =
  'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const TD = 'px-4 py-3 align-middle';

export interface CategoryRowActions {
  onEdit: (category: CategoryListItem) => void;
  onToggleActive: (category: CategoryListItem) => void;
}

/** Desktop (lg+) category table. Hidden below lg, where cards render instead. */
export function CategoriesTable({
  items,
  onEdit,
  onToggleActive,
}: { items: CategoryListItem[] } & CategoryRowActions) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t('staff.catalog.categories.list.tableCaption')}</caption>
        <thead>
          <tr className="border-b border-border bg-surface/60">
            <th scope="col" className={TH}>
              {t('staff.catalog.categories.list.columns.category')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.categories.list.columns.status')}
            </th>
            <th scope="col" className={`${TH} text-end`}>
              {t('staff.catalog.categories.list.columns.order')}
            </th>
            <th scope="col" className={`${TH} text-end`}>
              {t('staff.catalog.categories.list.columns.courses')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.categories.list.columns.updated')}
            </th>
            <th scope="col" className={`${TH} text-end`}>
              <span className="sr-only">{t('staff.catalog.categories.list.columns.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((category) => {
            const name = categoryName(category, lang);
            const altName = categoryAltName(category, lang);
            return (
              <tr
                key={category.id}
                className="border-b border-border transition-colors duration-fast last:border-0 hover:bg-surface/40"
              >
                <td className={TD}>
                  <div className="font-medium text-foreground" dir="auto">
                    {name}
                  </div>
                  {altName && altName !== name ? (
                    <div className="text-xs text-muted-foreground" dir="auto">
                      {altName}
                    </div>
                  ) : null}
                  {category.slug ? (
                    <div className="text-xs text-muted-foreground">{category.slug}</div>
                  ) : null}
                </td>
                <td className={TD}>
                  <CategoryStatusBadge isActive={category.isActive} />
                </td>
                <td className={`${TD} text-end tabular-nums text-muted-foreground`}>
                  {category.order ?? 0}
                </td>
                <td className={`${TD} text-end tabular-nums text-foreground`}>
                  {category.publishedCourseCount ?? 0}
                </td>
                <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                  {formatDate(category.updatedAt, lang)}
                </td>
                <td className={`${TD} text-end`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      onClick={() => onToggleActive(category)}
                      aria-label={t(
                        category.isActive
                          ? 'staff.catalog.categories.list.actions.deactivateAria'
                          : 'staff.catalog.categories.list.actions.activateAria',
                        { name },
                      )}
                    >
                      {category.isActive ? (
                        <PowerOff aria-hidden="true" />
                      ) : (
                        <Power aria-hidden="true" />
                      )}
                      {t(
                        category.isActive
                          ? 'staff.catalog.categories.list.actions.deactivate'
                          : 'staff.catalog.categories.list.actions.activate',
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

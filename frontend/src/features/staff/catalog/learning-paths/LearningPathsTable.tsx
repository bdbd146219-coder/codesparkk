import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgeBandBadge, ListedBadge, PublishStateBadge } from '../courses/badges';
import { formatDate, pathAltTitle, pathTitle, type LearningPathListItem } from './format';

const TH =
  'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const TD = 'px-4 py-3 align-middle';

/** Desktop (lg+) learning-paths table. Hidden below lg, where cards render. */
export function LearningPathsTable({ items }: { items: LearningPathListItem[] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t('staff.catalog.learningPaths.list.tableCaption')}</caption>
        <thead>
          <tr className="border-b border-border bg-surface/60">
            <th scope="col" className={TH}>
              {t('staff.catalog.learningPaths.list.columns.path')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.learningPaths.list.columns.status')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.learningPaths.list.columns.visibility')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.learningPaths.list.columns.ageBand')}
            </th>
            <th scope="col" className={`${TH} text-end`}>
              {t('staff.catalog.learningPaths.list.columns.courses')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.learningPaths.list.columns.updated')}
            </th>
            <th scope="col" className={`${TH} text-end`}>
              <span className="sr-only">
                {t('staff.catalog.learningPaths.list.columns.actions')}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((path) => {
            const title = pathTitle(path, lang);
            const altTitle = pathAltTitle(path, lang);
            return (
              <tr
                key={path.id}
                className="border-b border-border transition-colors duration-fast last:border-0 hover:bg-surface/40"
              >
                <td className={TD}>
                  <Link
                    to={`/staff/learning-paths/${path.id}`}
                    className="rounded-sm font-medium text-foreground transition-colors duration-fast hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    dir="auto"
                  >
                    {title}
                  </Link>
                  {altTitle && altTitle !== title ? (
                    <div className="text-xs text-muted-foreground" dir="auto">
                      {altTitle}
                    </div>
                  ) : null}
                  {path.slug ? (
                    <div className="text-xs text-muted-foreground">{path.slug}</div>
                  ) : null}
                </td>
                <td className={TD}>
                  <PublishStateBadge value={path.publishState} />
                </td>
                <td className={TD}>
                  <ListedBadge isListed={path.isListed} />
                </td>
                <td className={TD}>
                  <AgeBandBadge value={path.ageBand} />
                </td>
                <td className={`${TD} text-end tabular-nums text-foreground`}>
                  {path.itemCount ?? 0}
                </td>
                <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                  {formatDate(path.updatedAt, lang)}
                </td>
                <td className={`${TD} text-end`}>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    aria-label={t('staff.catalog.learningPaths.list.actions.manageAria', { title })}
                  >
                    <Link to={`/staff/learning-paths/${path.id}`}>
                      {t('staff.catalog.learningPaths.list.actions.manage')}
                      <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

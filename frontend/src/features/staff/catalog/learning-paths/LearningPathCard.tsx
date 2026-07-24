import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AgeBandBadge, ListedBadge, PublishStateBadge } from '../courses/badges';
import { formatDate, pathAltTitle, pathTitle, type LearningPathListItem } from './format';

function LearningPathCard({ path }: { path: LearningPathListItem }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const title = pathTitle(path, lang);
  const altTitle = pathAltTitle(path, lang);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/staff/learning-paths/${path.id}`}
              className="block truncate rounded-sm font-semibold text-foreground transition-colors duration-fast hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              dir="auto"
            >
              {title}
            </Link>
            {altTitle && altTitle !== title ? (
              <p className="truncate text-xs text-muted-foreground" dir="auto">
                {altTitle}
              </p>
            ) : null}
            {path.slug ? (
              <p className="truncate text-xs text-muted-foreground">{path.slug}</p>
            ) : null}
          </div>
          <PublishStateBadge value={path.publishState} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ListedBadge isListed={path.isListed} />
          <AgeBandBadge value={path.ageBand} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.learningPaths.list.columns.courses')}
            </dt>
            <dd className="tabular-nums text-foreground">{path.itemCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.learningPaths.list.columns.updated')}
            </dt>
            <dd className="text-foreground">{formatDate(path.updatedAt, lang)}</dd>
          </div>
        </dl>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full"
          aria-label={t('staff.catalog.learningPaths.list.actions.manageAria', { title })}
        >
          <Link to={`/staff/learning-paths/${path.id}`}>
            {t('staff.catalog.learningPaths.list.actions.manage')}
            <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Mobile/tablet (below lg) learning-path cards. Hidden at lg+, where the table renders. */
export function LearningPathCardList({ items }: { items: LearningPathListItem[] }) {
  return (
    <ul className="space-y-3 lg:hidden">
      {items.map((path) => (
        <li key={path.id}>
          <LearningPathCard path={path} />
        </li>
      ))}
    </ul>
  );
}

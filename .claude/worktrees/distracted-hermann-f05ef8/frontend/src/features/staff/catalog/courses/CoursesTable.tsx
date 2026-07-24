import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  AgeBandBadge,
  DeliveryTypeBadge,
  DifficultyBadge,
  ListedBadge,
  PublishStateBadge,
} from './badges';
import { categoryName, courseTitle, formatDate, type CourseListItem } from './format';

const TH =
  'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const TD = 'px-4 py-3 align-middle';

/** Desktop (lg+) course table. Hidden below lg, where cards render instead. */
export function CoursesTable({ items }: { items: CourseListItem[] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t('staff.catalog.courses.list.tableCaption')}</caption>
        <thead>
          <tr className="border-b border-border bg-surface/60">
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.course')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.status')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.delivery')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.difficulty')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.age')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.category')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.listed')}
            </th>
            <th scope="col" className={TH}>
              {t('staff.catalog.courses.list.columns.updated')}
            </th>
            <th scope="col" className={`${TH} text-end`}>
              <span className="sr-only">{t('staff.catalog.courses.list.columns.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((course) => {
            const title = courseTitle(course, lang);
            const category = categoryName(course.category, lang);
            return (
              <tr
                key={course.id}
                className="border-b border-border transition-colors duration-fast last:border-0 hover:bg-surface/40"
              >
                <td className={TD}>
                  <Link
                    to={`/staff/courses/${course.id}`}
                    className="rounded-sm font-medium text-foreground transition-colors duration-fast hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {title}
                  </Link>
                  {course.slug ? (
                    <div className="text-xs text-muted-foreground">{course.slug}</div>
                  ) : null}
                </td>
                <td className={TD}>
                  <PublishStateBadge value={course.publishState} />
                </td>
                <td className={TD}>
                  <DeliveryTypeBadge value={course.deliveryType} />
                </td>
                <td className={TD}>
                  <DifficultyBadge value={course.difficulty} />
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <AgeBandBadge value={course.ageBand} />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {course.minAge}–{course.maxAge}
                    </span>
                  </div>
                </td>
                <td className={TD}>
                  {category ? (
                    <span className="text-foreground">{category}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className={TD}>
                  <ListedBadge isListed={course.isListed} />
                </td>
                <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                  {formatDate(course.updatedAt, lang)}
                </td>
                <td className={`${TD} text-end`}>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    aria-label={t('staff.catalog.courses.list.actions.editAria', { title })}
                  >
                    <Link to={`/staff/courses/${course.id}`}>
                      {t('staff.catalog.courses.list.actions.edit')}
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

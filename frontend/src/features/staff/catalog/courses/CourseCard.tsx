import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AgeBandBadge,
  DeliveryTypeBadge,
  DifficultyBadge,
  ListedBadge,
  PublishStateBadge,
} from './badges';
import { categoryName, courseTitle, formatDate, type CourseListItem } from './format';

function CourseCard({ course }: { course: CourseListItem }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const title = courseTitle(course, lang);
  const category = categoryName(course.category, lang);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/staff/courses/${course.id}`}
              className="block truncate rounded-sm font-semibold text-foreground transition-colors duration-fast hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {title}
            </Link>
            {course.slug ? (
              <p className="truncate text-xs text-muted-foreground">{course.slug}</p>
            ) : null}
          </div>
          <PublishStateBadge value={course.publishState} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ListedBadge isListed={course.isListed} />
          <DeliveryTypeBadge value={course.deliveryType} />
          <DifficultyBadge value={course.difficulty} />
          <AgeBandBadge value={course.ageBand} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.courses.list.columns.category')}
            </dt>
            <dd className="text-foreground">{category ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.courses.list.columns.age')}
            </dt>
            <dd className="tabular-nums text-foreground">
              {course.minAge}–{course.maxAge}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t('staff.catalog.courses.list.columns.updated')}
            </dt>
            <dd className="text-foreground">{formatDate(course.updatedAt, lang)}</dd>
          </div>
        </dl>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full"
          aria-label={t('staff.catalog.courses.list.actions.editAria', { title })}
        >
          <Link to={`/staff/courses/${course.id}`}>
            {t('staff.catalog.courses.list.actions.edit')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** Mobile/tablet (below lg) course cards. Hidden at lg+, where the table renders. */
export function CourseCardList({ items }: { items: CourseListItem[] }) {
  return (
    <ul className="space-y-3 lg:hidden">
      {items.map((course) => (
        <li key={course.id}>
          <CourseCard course={course} />
        </li>
      ))}
    </ul>
  );
}

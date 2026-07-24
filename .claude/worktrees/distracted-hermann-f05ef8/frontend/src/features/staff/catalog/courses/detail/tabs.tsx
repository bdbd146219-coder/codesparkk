import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListedBadge, PublishStateBadge } from '../badges';
import { formatDate } from '../format';
import type { AdminCourseDetail } from './detail-helpers';
import { ReadinessChecklist } from './ReadinessChecklist';
import { LifecycleActions } from './LifecycleActions';
import { ModulesManager } from './ModulesManager';
import { InstructorsManager } from './InstructorsManager';
import type { LifecycleDemo } from './lifecycle';
import type { ModuleDemo } from './modules';
import type { InstructorDemo } from './instructors';

const DASH = '—';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** Bidi-isolated date so numeric/slashed dates don't reorder in RTL. */
function DateValue({ iso, lang }: { iso: string | null | undefined; lang: string }) {
  return <bdi>{formatDate(iso, lang)}</bdi>;
}

// --- Modules ----------------------------------------------------------------

export function ModulesTab({
  course,
  lang,
  onReloadLatest,
  demo,
}: {
  course: AdminCourseDetail;
  lang: string;
  onReloadLatest: () => void;
  demo?: ModuleDemo;
}) {
  return <ModulesManager course={course} lang={lang} onReloadLatest={onReloadLatest} demo={demo} />;
}

// --- Instructors ------------------------------------------------------------

export function InstructorsTab({
  course,
  onReloadLatest,
  demo,
}: {
  course: AdminCourseDetail;
  onReloadLatest: () => void;
  demo?: InstructorDemo;
}) {
  return <InstructorsManager course={course} onReloadLatest={onReloadLatest} demo={demo} />;
}

// --- Publishing -------------------------------------------------------------

export function PublishingTab({
  course,
  lang,
  onReloadLatest,
  demo,
}: {
  course: AdminCourseDetail;
  lang: string;
  onReloadLatest: () => void;
  demo?: LifecycleDemo;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('staff.catalog.courses.detail.publishing.stateHeading')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Field label={t('staff.catalog.courses.detail.overview.status')}>
              <PublishStateBadge value={course.publishState} />
            </Field>
            <Field label={t('staff.catalog.courses.detail.overview.visibility')}>
              <ListedBadge isListed={course.isListed} />
            </Field>
            <Field label={t('staff.catalog.courses.detail.overview.published')}>
              {course.publishedAt ? <DateValue iso={course.publishedAt} lang={lang} /> : DASH}
            </Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('staff.catalog.courses.detail.publishing.readinessHeading')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReadinessChecklist readiness={course.publishReadiness} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="text-base">
            {t('staff.catalog.courses.detail.publishing.lifecycleHeading')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('staff.catalog.courses.detail.publishing.lifecycleNotice')}
          </p>
        </CardHeader>
        <CardContent>
          <LifecycleActions course={course} onReloadLatest={onReloadLatest} demo={demo} />
        </CardContent>
      </Card>
    </div>
  );
}

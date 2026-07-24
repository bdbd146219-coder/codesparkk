import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, isConcurrencyError } from '@/lib/api/errors';
import { useAdminCategories } from '@/features/staff/catalog/api';
import { useUpdateCourse } from '@/features/staff/catalog/api';
import {
  AgeBandBadge,
  DeliveryTypeBadge,
  DifficultyBadge,
  ListedBadge,
  PublishStateBadge,
} from '../../badges';
import { ConcurrencyAlert } from '../../ConcurrencyAlert';
import { DETAIL_TABS, bilingual, detailTitle, normalizeTab } from '../detail-helpers';
import type { AdminCourseDetail } from '../detail-helpers';
import { InstructorsTab, ModulesTab, PublishingTab } from '../tabs';
import type { LifecycleDemo } from '../lifecycle';
import type { ModuleDemo } from '../modules';
import type { InstructorDemo } from '../instructors';
import {
  courseFormSchema,
  courseToForm,
  formToUpdateBody,
  mapServerErrors,
  type CourseFormValues,
} from './course-form';
import { ContentForm } from './ContentForm';
import { OverviewForm } from './OverviewForm';
import type { AdminCategoryListResult } from '@/lib/api/admin/categories';

export interface CourseEditorDemo {
  dirty?: boolean;
  saving?: boolean;
  conflict?: boolean;
  serverErrorKey?: string;
  /** Forces lifecycle (Publishing tab) visual states for screenshot QA. */
  lifecycle?: LifecycleDemo;
  /** Forces Modules-tab visual states for screenshot QA. */
  modules?: ModuleDemo;
  /** Forces Instructors-tab visual states for screenshot QA. */
  instructors?: InstructorDemo;
}

export interface CourseEditorProps {
  course: AdminCourseDetail;
  onReloadLatest: () => void;
  /** Dev-only display overrides for visual QA (live path never passes this). */
  demo?: CourseEditorDemo;
}

function buildCategoryOptions(
  data: AdminCategoryListResult | undefined,
  course: AdminCourseDetail,
  lang: string,
): { value: string; label: string }[] {
  const options = (data?.items ?? [])
    .filter((c): c is typeof c & { id: string } => Boolean(c.id))
    .map((c) => ({ value: c.id, label: bilingual(c.nameEn, c.nameAr, lang) || c.slug || c.id }));

  const currentId = course.primaryCategoryId ?? course.category?.id;
  if (currentId && !options.some((o) => o.value === currentId)) {
    const label =
      bilingual(course.category?.nameEn, course.category?.nameAr, lang) ||
      course.category?.slug ||
      currentId;
    options.unshift({ value: currentId, label });
  }
  return options;
}

export function CourseEditor({ course, onReloadLatest, demo }: CourseEditorProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = normalizeTab(searchParams.get('tab'));

  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next);
  };

  const categoriesQuery = useAdminCategories();
  const categoryOptions = useMemo(
    () => buildCategoryOptions(categoriesQuery.data, course, lang),
    [categoriesQuery.data, course, lang],
  );

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: courseToForm(course),
    mode: 'onBlur',
  });
  const mutation = useUpdateCourse();
  const [conflict, setConflict] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);
  const [unmappedErrors, setUnmappedErrors] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const archived = course.publishState === 'Archived';

  // Reset whenever a new course version arrives (reload-latest / external save).
  useEffect(() => {
    form.reset(courseToForm(course));
    setConflict(false);
    setServerErrorKey(null);
    setUnmappedErrors([]);
  }, [course, form]);

  const onSubmit = form.handleSubmit((values) => {
    setServerErrorKey(null);
    setUnmappedErrors([]);
    setConflict(false);
    setSavedAt(null);
    mutation.mutate(
      { id: course.id ?? '', body: formToUpdateBody(values, course.rowVersion) },
      {
        onSuccess: (updated) => {
          form.reset(courseToForm(updated));
          setSavedAt(Date.now());
        },
        onError: (err) => {
          if (isConcurrencyError(err)) {
            setConflict(true);
            return;
          }
          if (err instanceof ApiError && err.status === 409) {
            form.setError('slug', { message: 'staff.catalog.courses.edit.validation.slugTaken' });
            setServerErrorKey('staff.catalog.courses.edit.error.slugTaken');
            setTab('overview');
            return;
          }
          const mapped = mapServerErrors(err);
          if (mapped) {
            for (const field of mapped.fields)
              form.setError(field.field, { message: field.message });
            setUnmappedErrors(mapped.unmapped);
            setServerErrorKey('staff.catalog.courses.edit.error.validation');
            return;
          }
          setServerErrorKey('staff.catalog.courses.edit.error.generic');
        },
      },
    );
  });

  const dirty = demo?.dirty ?? form.formState.isDirty;
  const saving = demo?.saving ?? mutation.isPending;
  const showConflict = demo?.conflict ?? conflict;
  const errorKey = demo?.serverErrorKey ?? serverErrorKey;
  const fieldsDisabled = archived || saving;
  const showSaved = savedAt !== null && !dirty && !errorKey;

  const handleCancel = () => {
    form.reset(courseToForm(course));
    setServerErrorKey(null);
    setUnmappedErrors([]);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {detailTitle(course, lang)}
              </h1>
              {course.slug ? (
                <p className="text-sm text-primary-foreground/80">{course.slug}</p>
              ) : null}
            </div>
            {!archived ? (
              <div className="flex flex-wrap items-center gap-3">
                {dirty ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-primary-foreground"
                    />
                    {t('staff.catalog.courses.edit.unsavedChanges')}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={!dirty || saving}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {t('staff.catalog.courses.edit.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={!dirty || saving}
                  className="bg-background text-primary shadow-sm hover:bg-background/90"
                >
                  {saving ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Save aria-hidden="true" />
                  )}
                  {saving
                    ? t('staff.catalog.courses.edit.saving')
                    : t('staff.catalog.courses.edit.save')}
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <PublishStateBadge value={course.publishState} />
          <ListedBadge isListed={course.isListed} />
          <DeliveryTypeBadge value={course.deliveryType} />
          <DifficultyBadge value={course.difficulty} />
          <AgeBandBadge value={course.ageBand} />
        </div>

        {archived ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 p-4 text-sm text-muted-foreground"
          >
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            {t('staff.catalog.courses.edit.archivedNote')}
          </div>
        ) : null}

        {showSaved ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground"
          >
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
            {t('staff.catalog.courses.edit.savedToast')}
          </div>
        ) : null}

        {showConflict ? <ConcurrencyAlert onReload={onReloadLatest} /> : null}

        {errorKey ? (
          <div
            role="alert"
            className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <p className="text-sm font-semibold text-foreground">
              {t('staff.catalog.courses.edit.error.summaryTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{t(errorKey)}</p>
            {unmappedErrors.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                {unmappedErrors.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto pb-1">
            <TabsList>
              {DETAIL_TABS.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {t(`staff.catalog.courses.detail.tabs.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="overview">
            <OverviewForm categoryOptions={categoryOptions} disabled={fieldsDisabled} />
          </TabsContent>
          <TabsContent value="content">
            <ContentForm disabled={fieldsDisabled} />
          </TabsContent>
          <TabsContent value="modules">
            <ModulesTab
              course={course}
              lang={lang}
              onReloadLatest={onReloadLatest}
              demo={demo?.modules}
            />
          </TabsContent>
          <TabsContent value="instructors">
            <InstructorsTab
              course={course}
              onReloadLatest={onReloadLatest}
              demo={demo?.instructors}
            />
          </TabsContent>
          <TabsContent value="publishing">
            <PublishingTab
              course={course}
              lang={lang}
              onReloadLatest={onReloadLatest}
              demo={demo?.lifecycle}
            />
          </TabsContent>
        </Tabs>
      </form>
    </FormProvider>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, FilePlus2, Loader2 } from 'lucide-react';
import { Breadcrumbs, Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api/errors';
import { useAdminCategories, useCreateCourse } from '@/features/staff/catalog/api';
import {
  AGE_BAND_VALUES,
  DELIVERY_VALUES,
  DIFFICULTY_VALUES,
} from '@/features/staff/catalog/courses/filters';
import { NumberField, SelectField, TextField } from '../detail/edit/fields';
import {
  courseFormSchema,
  mapServerErrors,
  type CourseFormValues,
} from '../detail/edit/course-form';
import {
  buildCreateCategoryOptions,
  createCourseDefaults,
  formToCreateBody,
} from './course-create';

const KEY = 'staff.catalog.courses.create';
const GUIDANCE_STEPS = ['content', 'modules', 'instructor', 'media', 'publish'] as const;

/** Dev-only overrides that force create-form visual states for screenshot QA. */
interface CreateDemo {
  saving?: boolean;
  invalid?: boolean;
  conflict?: boolean;
  filled?: boolean;
}

/**
 * Admin course create page at `/staff/courses/new` (behind RequireStaff).
 * Reuses the C2F course-form foundation for a short "draft first" step, then
 * redirects into the editor at `/staff/courses/:id`. In dev, `?state=` renders
 * fixtures so each state is screenshot-able without a backend; that branch is
 * DCE'd from production.
 */
export function CourseCreatePage() {
  if (import.meta.env.DEV) {
    const demo = readDevCreateState();
    if (demo) return <CourseCreateForm demo={demo} />;
  }
  return <CourseCreateForm />;
}

function filledDefaults(): CourseFormValues {
  return {
    ...createCourseDefaults(),
    titleEn: 'Intro to Scratch',
    titleAr: 'مقدمة إلى سكراتش',
    slug: 'intro-to-scratch',
    primaryCategoryId: 'cat-1',
  };
}

function CourseCreateForm({ demo }: { demo?: CreateDemo }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: demo?.filled ? filledDefaults() : createCourseDefaults(),
    mode: 'onBlur',
  });
  const mutation = useCreateCourse();
  const categoriesQuery = useAdminCategories();

  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);
  const [unmappedErrors, setUnmappedErrors] = useState<string[]>([]);

  const categoryOptions = useMemo(() => {
    const choose = t(`${KEY}.chooseCategory`);
    if (demo) {
      return [
        { value: '', label: choose },
        { value: 'cat-1', label: 'Foundations' },
        { value: 'cat-2', label: 'Creative Coding' },
      ];
    }
    return buildCreateCategoryOptions(categoriesQuery.data, choose, lang);
  }, [demo, categoriesQuery.data, lang, t]);

  useEffect(() => {
    if (demo?.invalid) void form.trigger();
    if (demo?.conflict) {
      form.setError('slug', { message: 'staff.catalog.courses.edit.validation.slugTaken' });
      setServerErrorKey(`${KEY}.error.slugTaken`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const saving = demo?.saving ?? mutation.isPending;

  const enumOptions = (values: readonly string[], group: string) =>
    values.map((v) => ({ value: v, label: t(`staff.catalog.enums.${group}.${v}`) }));

  const onSubmit = form.handleSubmit((values) => {
    setServerErrorKey(null);
    setUnmappedErrors([]);
    mutation.mutate(formToCreateBody(values), {
      onSuccess: (created) => {
        if (created?.id) {
          navigate(`/staff/courses/${created.id}`);
          return;
        }
        // Contract returns an id; guard the unlikely gap without losing the draft.
        setServerErrorKey(`${KEY}.error.noId`);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          form.setError('slug', { message: 'staff.catalog.courses.edit.validation.slugTaken' });
          setServerErrorKey(`${KEY}.error.slugTaken`);
          return;
        }
        const mapped = mapServerErrors(err);
        if (mapped) {
          for (const field of mapped.fields) form.setError(field.field, { message: field.message });
          setUnmappedErrors(mapped.unmapped);
          setServerErrorKey(`${KEY}.error.validation`);
          return;
        }
        setServerErrorKey(`${KEY}.error.generic`);
      },
    });
  });

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/10 via-background to-background">
      <Container size="xl" padded>
        <div className="space-y-6 py-6">
          <Breadcrumbs
            items={[
              { label: t('staff.home.crumbHome'), to: '/staff' },
              { label: t('staff.catalog.courses.title'), to: '/staff/courses' },
              { label: t('staff.catalog.courses.newCrumb') },
            ]}
          />

          <FormProvider {...form}>
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-lg sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl space-y-1.5">
                    <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                      {t(`${KEY}.title`)}
                    </h1>
                    <p className="text-sm text-primary-foreground/85">{t(`${KEY}.lead`)}</p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Link to="/staff/courses">
                      <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                      {t('staff.catalog.courses.detail.backToCourses')}
                    </Link>
                  </Button>
                </div>
              </header>

              {serverErrorKey ? (
                <div
                  role="alert"
                  className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {t(`${KEY}.error.summaryTitle`)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(serverErrorKey)}</p>
                  {unmappedErrors.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {unmappedErrors.map((message, i) => (
                        <li key={i}>{message}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-6">
                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base">{t(`${KEY}.basics`)}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <TextField
                        name="titleEn"
                        labelKey={`${KEY}.fields.titleEn`}
                        required
                        disabled={saving}
                        dir="ltr"
                      />
                      <TextField
                        name="titleAr"
                        labelKey={`${KEY}.fields.titleAr`}
                        disabled={saving}
                        dir="rtl"
                      />
                      <div className="sm:col-span-2">
                        <TextField
                          name="slug"
                          labelKey="staff.catalog.courses.detail.overview.slug"
                          hintKey="staff.catalog.courses.edit.fields.slugHint"
                          disabled={saving}
                          dir="ltr"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="text-base">{t(`${KEY}.classification`)}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <SelectField
                        name="primaryCategoryId"
                        labelKey="staff.catalog.courses.detail.overview.category"
                        options={categoryOptions}
                        disabled={saving}
                        required
                      />
                      <SelectField
                        name="deliveryType"
                        labelKey="staff.catalog.courses.detail.overview.delivery"
                        options={enumOptions(DELIVERY_VALUES, 'deliveryType')}
                        disabled={saving}
                        required
                      />
                      <SelectField
                        name="difficulty"
                        labelKey="staff.catalog.courses.detail.overview.difficulty"
                        options={enumOptions(DIFFICULTY_VALUES, 'difficulty')}
                        disabled={saving}
                        required
                      />
                      <SelectField
                        name="ageBand"
                        labelKey="staff.catalog.courses.detail.overview.ageBand"
                        options={enumOptions(AGE_BAND_VALUES, 'ageBand')}
                        disabled={saving}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                        <NumberField
                          name="minAge"
                          labelKey="staff.catalog.courses.edit.fields.minAge"
                          disabled={saving}
                        />
                        <NumberField
                          name="maxAge"
                          labelKey="staff.catalog.courses.edit.fields.maxAge"
                          disabled={saving}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button asChild variant="ghost" disabled={saving}>
                      <Link to="/staff/courses">{t(`${KEY}.cancel`)}</Link>
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 aria-hidden="true" className="animate-spin" />
                      ) : (
                        <FilePlus2 aria-hidden="true" />
                      )}
                      {saving ? t(`${KEY}.submitting`) : t(`${KEY}.submit`)}
                    </Button>
                  </div>
                </div>

                <aside>
                  <Card className="h-fit shadow-md lg:sticky lg:top-6">
                    <CardHeader className="gap-1">
                      <CardTitle className="text-base">{t(`${KEY}.guidance.title`)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t(`${KEY}.guidance.lead`)}</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {GUIDANCE_STEPS.map((step) => (
                          <li
                            key={step}
                            className="flex items-start gap-2.5 text-sm text-foreground"
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-primary"
                            />
                            {t(`${KEY}.guidance.${step}`)}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </form>
          </FormProvider>
        </div>
      </Container>
    </div>
  );
}

const DEV_STATES = ['filled', 'invalid', 'conflict', 'submitting'] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevCreateState(): CreateDemo | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  if (!(DEV_STATES as readonly string[]).includes(state)) return null;
  switch (state as DevState) {
    case 'filled':
      return { filled: true };
    case 'invalid':
      return { invalid: true };
    case 'conflict':
      return { conflict: true, filled: true };
    case 'submitting':
      return { saving: true, filled: true };
  }
}

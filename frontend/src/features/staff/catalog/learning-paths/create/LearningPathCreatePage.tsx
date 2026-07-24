import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, FilePlus2, Loader2 } from 'lucide-react';
import { Breadcrumbs, Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api/errors';
import { useCreateLearningPath } from '@/features/staff/catalog/api';
import { AGE_BAND_VALUES } from '../filters';
import { SelectField, TextAreaField, TextField } from '../detail/edit/fields';
import {
  learningPathFormSchema,
  mapServerErrors,
  type LearningPathFormValues,
} from '../detail/edit/lp-form';
import { createLearningPathDefaults, formToCreateBody } from './lp-create';

const KEY = 'staff.catalog.learningPaths.create';
const V = 'staff.catalog.learningPaths.edit.validation';
const GUIDANCE_STEPS = ['content', 'items', 'published', 'media', 'publish'] as const;

/** Dev-only overrides that force create-form visual states for screenshot QA. */
interface CreateDemo {
  saving?: boolean;
  invalid?: boolean;
  conflict?: boolean;
  filled?: boolean;
}

/**
 * Admin learning-path create page at `/staff/learning-paths/new` (behind
 * RequireStaff). Reuses the C3D learning-path form foundation for a short
 * "draft first" step, then redirects into the editor at
 * `/staff/learning-paths/:id`. In dev, `?state=` renders fixtures so each state
 * is screenshot-able without a backend; that branch is DCE'd from production.
 */
export function LearningPathCreatePage() {
  if (import.meta.env.DEV) {
    const demo = readDevCreateState();
    if (demo) return <LearningPathCreateForm demo={demo} />;
  }
  return <LearningPathCreateForm />;
}

function filledDefaults(): LearningPathFormValues {
  return {
    ...createLearningPathDefaults(),
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    slug: 'junior-coder-journey',
    summaryEn: 'A guided path from first blocks to first programs, one course at a time.',
    summaryAr: 'مسار موجّه من أول اللبنات إلى أول البرامج، دورة تلو الأخرى.',
  };
}

function LearningPathCreateForm({ demo }: { demo?: CreateDemo }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const form = useForm<LearningPathFormValues>({
    resolver: zodResolver(learningPathFormSchema),
    defaultValues: demo?.filled ? filledDefaults() : createLearningPathDefaults(),
    mode: 'onBlur',
  });
  const mutation = useCreateLearningPath();

  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);
  const [unmappedErrors, setUnmappedErrors] = useState<string[]>([]);

  useEffect(() => {
    if (demo?.invalid) void form.trigger();
    if (demo?.conflict) {
      form.setError('slug', { message: `${V}.slugTaken` });
      setServerErrorKey(`${KEY}.error.slugTaken`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const saving = demo?.saving ?? mutation.isPending;

  const ageBandOptions = AGE_BAND_VALUES.map((v) => ({
    value: v,
    label: t(`staff.catalog.enums.ageBand.${v}`),
  }));

  const onSubmit = form.handleSubmit((values) => {
    setServerErrorKey(null);
    setUnmappedErrors([]);
    mutation.mutate(formToCreateBody(values), {
      onSuccess: (created) => {
        if (created?.id) {
          navigate(`/staff/learning-paths/${created.id}`);
          return;
        }
        // Contract returns an id; guard the unlikely gap without losing the draft.
        setServerErrorKey(`${KEY}.error.noId`);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          form.setError('slug', { message: `${V}.slugTaken` });
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
              { label: t('staff.catalog.learningPaths.title'), to: '/staff/learning-paths' },
              { label: t('staff.catalog.learningPaths.newCrumb') },
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
                    <Link to="/staff/learning-paths">
                      <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                      {t('staff.catalog.learningPaths.detail.backToPaths')}
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
                      <TextField
                        name="slug"
                        labelKey="staff.catalog.learningPaths.detail.overview.slug"
                        hintKey={`${KEY}.fields.slugHint`}
                        disabled={saving}
                        dir="ltr"
                      />
                      <SelectField
                        name="ageBand"
                        labelKey="staff.catalog.learningPaths.detail.overview.ageBand"
                        options={ageBandOptions}
                        disabled={saving}
                        required
                      />
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader className="gap-1">
                      <CardTitle className="text-base">{t(`${KEY}.content`)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t(`${KEY}.contentLead`)}</p>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                      <TextAreaField
                        name="summaryEn"
                        labelKey={`${KEY}.fields.summaryEn`}
                        disabled={saving}
                        dir="ltr"
                      />
                      <TextAreaField
                        name="summaryAr"
                        labelKey={`${KEY}.fields.summaryAr`}
                        disabled={saving}
                        dir="rtl"
                      />
                    </CardContent>
                  </Card>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button asChild variant="ghost" disabled={saving}>
                      <Link to="/staff/learning-paths">{t(`${KEY}.cancel`)}</Link>
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

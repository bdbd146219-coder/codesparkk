import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, Lock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, isConcurrencyError } from '@/lib/api/errors';
import { useUpdateLearningPath } from '@/features/staff/catalog/api';
import { AgeBandBadge, ListedBadge, PublishStateBadge } from '../../courses/badges';
import { ConcurrencyAlert } from '../../courses/ConcurrencyAlert';
import { DETAIL_TABS, detailTitle, normalizeTab, sortedItems } from './detail-helpers';
import type { AdminLearningPathDetail } from './detail-helpers';
import { PublishingPanel } from './panels';
import type { LifecycleDemo } from './lifecycle';
import { LearningPathItemsManager } from './items/LearningPathItemsManager';
import type { ItemsDemo } from './items/items';
import { ContentForm } from './edit/ContentForm';
import { OverviewForm } from './edit/OverviewForm';
import {
  detailToForm,
  formToUpdateBody,
  learningPathFormSchema,
  mapServerErrors,
  type LearningPathFormValues,
} from './edit/lp-form';

const KEY = 'staff.catalog.learningPaths';

export interface LearningPathEditorDemo {
  dirty?: boolean;
  saving?: boolean;
  conflict?: boolean;
  serverErrorKey?: string;
  /** Forces Items-tab visual states for screenshot QA. */
  items?: ItemsDemo;
  /** Forces Publishing-tab lifecycle visual states for screenshot QA. */
  lifecycle?: LifecycleDemo;
}

export interface LearningPathEditorProps {
  path: AdminLearningPathDetail;
  onReloadLatest: () => void;
  /** Dev-only display overrides for visual QA (live path never passes this). */
  demo?: LearningPathEditorDemo;
}

/**
 * Editable learning-path shell (C3D). Overview + Content are RHF forms; Items +
 * Publishing stay read-only. Every save carries the current rowVersion; a 409
 * concurrency conflict surfaces the shared ConcurrencyAlert with a reload (never
 * an auto-retry or silent overwrite), a 409 slug clash maps to the slug field,
 * and a 400 maps per-field. Archived paths are read-only (backend rejects edits).
 */
export function LearningPathEditor({ path, onReloadLatest, demo }: LearningPathEditorProps) {
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

  const form = useForm<LearningPathFormValues>({
    resolver: zodResolver(learningPathFormSchema),
    defaultValues: detailToForm(path),
    mode: 'onBlur',
  });
  const mutation = useUpdateLearningPath();
  const [conflict, setConflict] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);
  const [unmappedErrors, setUnmappedErrors] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const archived = path.publishState === 'Archived';

  // Reset whenever a new path version arrives (reload-latest / external save).
  useEffect(() => {
    form.reset(detailToForm(path));
    setConflict(false);
    setServerErrorKey(null);
    setUnmappedErrors([]);
  }, [path, form]);

  const onSubmit = form.handleSubmit((values) => {
    setServerErrorKey(null);
    setUnmappedErrors([]);
    setConflict(false);
    setSavedAt(null);
    mutation.mutate(
      { id: path.id ?? '', body: formToUpdateBody(values, path.rowVersion) },
      {
        onSuccess: (updated) => {
          form.reset(detailToForm(updated));
          setSavedAt(Date.now());
        },
        onError: (err) => {
          if (isConcurrencyError(err)) {
            setConflict(true);
            return;
          }
          if (err instanceof ApiError && err.status === 409) {
            form.setError('slug', { message: `${KEY}.edit.validation.slugTaken` });
            setServerErrorKey(`${KEY}.edit.error.slugTaken`);
            setTab('overview');
            return;
          }
          const mapped = mapServerErrors(err);
          if (mapped) {
            for (const field of mapped.fields)
              form.setError(field.field, { message: field.message });
            setUnmappedErrors(mapped.unmapped);
            setServerErrorKey(`${KEY}.edit.error.validation`);
            return;
          }
          setServerErrorKey(`${KEY}.edit.error.generic`);
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
    form.reset(detailToForm(path));
    setServerErrorKey(null);
    setUnmappedErrors([]);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h1
                className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
                dir="auto"
              >
                {detailTitle(path, lang)}
              </h1>
              {path.slug ? (
                <p className="text-sm text-primary-foreground/80">
                  <bdi dir="ltr">{path.slug}</bdi>
                </p>
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
                    {t(`${KEY}.edit.unsavedChanges`)}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={!dirty || saving}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {t(`${KEY}.edit.cancel`)}
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
                  {saving ? t(`${KEY}.edit.saving`) : t(`${KEY}.edit.save`)}
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <PublishStateBadge value={path.publishState} />
          <ListedBadge isListed={path.isListed} />
          <AgeBandBadge value={path.ageBand} />
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {t(`${KEY}.detail.coursesCount`, { count: sortedItems(path).length })}
          </span>
        </div>

        {archived ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 p-4 text-sm text-muted-foreground"
          >
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            {t(`${KEY}.edit.archivedNote`)}
          </div>
        ) : null}

        {showSaved ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground"
          >
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
            {t(`${KEY}.edit.savedToast`)}
          </div>
        ) : null}

        {showConflict ? (
          <ConcurrencyAlert
            titleKey={`${KEY}.edit.concurrency.title`}
            bodyKey={`${KEY}.edit.concurrency.body`}
            reloadKey={`${KEY}.edit.concurrency.reload`}
            onReload={onReloadLatest}
          />
        ) : null}

        {errorKey ? (
          <div
            role="alert"
            className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <p className="text-sm font-semibold text-foreground">
              {t(`${KEY}.edit.error.summaryTitle`)}
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
                  {t(`${KEY}.detail.tabs.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="overview">
            <OverviewForm path={path} lang={lang} disabled={fieldsDisabled} />
          </TabsContent>
          <TabsContent value="content">
            <ContentForm disabled={fieldsDisabled} />
          </TabsContent>
          <TabsContent value="items">
            <LearningPathItemsManager
              path={path}
              onReloadLatest={onReloadLatest}
              demo={demo?.items}
            />
          </TabsContent>
          <TabsContent value="publishing">
            <PublishingPanel path={path} onReloadLatest={onReloadLatest} demo={demo?.lifecycle} />
          </TabsContent>
        </Tabs>
      </form>
    </FormProvider>
  );
}

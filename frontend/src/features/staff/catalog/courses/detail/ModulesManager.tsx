import { useEffect, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isConcurrencyError } from '@/lib/api/errors';
import {
  useAddCourseModule,
  useRemoveCourseModule,
  useReorderCourseModules,
  useUpdateCourseModule,
} from '@/features/staff/catalog/api';
import type { AdminCourseDetail } from '@/lib/api/admin/courses';
import { ConcurrencyAlert } from '../ConcurrencyAlert';
import { bilingual } from './detail-helpers';
import {
  formToAddBody,
  formToUpdateBody,
  mapModuleServerErrors,
  moduleErrorKey,
  moduleFormSchema,
  moduleToForm,
  moveModuleIds,
  sortedModules,
  type CourseModule,
  type ModuleDemo,
  type ModuleFeedback,
  type ModuleFormValues,
} from './modules';

const KEY = 'staff.catalog.courses.detail.modules';

export interface ModulesManagerProps {
  course: AdminCourseDetail;
  lang: string;
  onReloadLatest: () => void;
  /** Dev-only display overrides for visual QA (live path never passes this). */
  demo?: ModuleDemo;
}

/**
 * Functional Modules tab. Add / edit / remove modules through focus-trapped
 * dialogs and reorder them with move up/down (no drag-and-drop in V1). Every
 * mutation carries the current course rowVersion; the hooks return the full
 * course detail and seed the cache, so the list and the publish-readiness
 * checklist update together. 409 surfaces the shared ConcurrencyAlert with a
 * reload — never an auto-retry or silent overwrite.
 */
export function ModulesManager({ course, lang, onReloadLatest, demo }: ModulesManagerProps) {
  const { t } = useTranslation();
  const modules = sortedModules(course);

  const addModule = useAddCourseModule();
  const updateModule = useUpdateCourseModule();
  const removeModule = useRemoveCourseModule();
  const reorderModules = useReorderCourseModules();

  const [formTarget, setFormTarget] = useState<CourseModule | 'new' | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CourseModule | null>(null);
  const [feedback, setFeedback] = useState<ModuleFeedback | null>(null);
  const [conflict, setConflict] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Fresh server data (reload / the refetch after a successful mutation) clears
  // transient error state; success feedback is intentionally left sticky.
  useEffect(() => {
    setConflict(false);
    setErrorKey(null);
  }, [course.rowVersion]);

  const courseId = course.id ?? '';
  const rowVersion = course.rowVersion ?? null;

  const clearTransient = () => {
    setFeedback(null);
    setConflict(false);
    setErrorKey(null);
  };

  const openAdd = () => {
    clearTransient();
    setFormTarget('new');
  };

  // add/edit save — rejects with the ApiError so the dialog can map 400 to
  // fields; success closes the dialog and records feedback here.
  const saveModule = async (values: ModuleFormValues) => {
    clearTransient();
    if (formTarget === 'new') {
      await addModule.mutateAsync({ id: courseId, body: formToAddBody(values, rowVersion) });
      setFeedback('added');
    } else if (formTarget) {
      await updateModule.mutateAsync({
        id: courseId,
        moduleId: formTarget.id ?? '',
        body: formToUpdateBody(values, rowVersion),
      });
      setFeedback('updated');
    }
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    clearTransient();
    removeModule.mutate(
      { id: courseId, moduleId: removeTarget.id ?? '', body: { rowVersion } },
      {
        onSuccess: () => {
          setRemoveTarget(null);
          setFeedback('removed');
        },
        onError: (err) => {
          setRemoveTarget(null);
          if (isConcurrencyError(err)) {
            setConflict(true);
            return;
          }
          setErrorKey(moduleErrorKey(err));
        },
      },
    );
  };

  const move = (index: number, direction: 'up' | 'down') => {
    const orderedModuleIds = moveModuleIds(modules, index, direction);
    if (!orderedModuleIds) return;
    clearTransient();
    reorderModules.mutate(
      { id: courseId, body: { rowVersion, orderedModuleIds } },
      {
        onSuccess: () => setFeedback('reordered'),
        onError: (err) => {
          if (isConcurrencyError(err)) {
            setConflict(true);
            return;
          }
          setErrorKey(moduleErrorKey(err));
        },
      },
    );
  };

  const handleReload = () => {
    setConflict(false);
    setErrorKey(null);
    setFormTarget(null);
    setRemoveTarget(null);
    onReloadLatest();
  };

  // Demo overrides for visual QA — the live path leaves `demo` undefined.
  const renderForm =
    demo?.dialog === 'add' ? 'new' : demo?.dialog === 'edit' ? (modules[0] ?? 'new') : formTarget;
  const renderRemove = demo?.remove ? (modules[0] ?? null) : removeTarget;
  const showConflict = demo?.conflict ?? conflict;
  const activeFeedback = demo?.feedback ?? feedback;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{t(`${KEY}.heading`)}</h2>
          <p className="text-sm text-muted-foreground">{t(`${KEY}.lead`)}</p>
        </div>
        {modules.length > 0 ? (
          <Button type="button" size="sm" onClick={openAdd} className="shrink-0">
            <Plus aria-hidden="true" />
            {t(`${KEY}.add`)}
          </Button>
        ) : null}
      </div>

      {activeFeedback ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground"
        >
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
          {t(`${KEY}.feedback.${activeFeedback}`)}
        </div>
      ) : null}

      {showConflict ? <ConcurrencyAlert onReload={handleReload} /> : null}

      {errorKey ? (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="text-sm font-semibold text-foreground">{t(`${KEY}.error.title`)}</p>
          <p className="text-sm text-muted-foreground">{t(errorKey)}</p>
        </div>
      ) : null}

      {modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">{t(`${KEY}.empty`)}</p>
            <Button type="button" variant="outline" size="sm" onClick={openAdd}>
              <Plus aria-hidden="true" />
              {t(`${KEY}.add`)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-3">
          {modules.map((module, index) => (
            <li key={module.id ?? index}>
              <ModuleCard
                module={module}
                index={index}
                total={modules.length}
                lang={lang}
                reordering={reorderModules.isPending}
                onEdit={() => {
                  clearTransient();
                  setFormTarget(module);
                }}
                onRemove={() => {
                  clearTransient();
                  setRemoveTarget(module);
                }}
                onMoveUp={() => move(index, 'up')}
                onMoveDown={() => move(index, 'down')}
              />
            </li>
          ))}
        </ol>
      )}

      {renderForm ? (
        <ModuleFormDialog
          mode={renderForm === 'new' ? 'add' : 'edit'}
          module={renderForm === 'new' ? null : renderForm}
          onSave={saveModule}
          onSuccess={() => setFormTarget(null)}
          onConflict={() => {
            setFormTarget(null);
            setConflict(true);
          }}
          onCancel={() => setFormTarget(null)}
          demoSaving={demo?.saving}
          demoInvalid={demo?.invalid}
        />
      ) : null}

      {renderRemove ? (
        <RemoveModuleDialog
          module={renderRemove}
          lang={lang}
          pending={demo?.remove ? Boolean(demo.saving) : removeModule.isPending}
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      ) : null}
    </div>
  );
}

function ModuleCard({
  module,
  index,
  total,
  lang,
  reordering,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  module: CourseModule;
  index: number;
  total: number;
  lang: string;
  reordering: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation();
  const primaryTitle = bilingual(module.titleEn, module.titleAr, lang) || t(`${KEY}.noTitle`);
  const altTitle = (lang.startsWith('ar') ? module.titleEn : module.titleAr)?.trim();
  const summary = bilingual(module.summaryEn, module.summaryAr, lang);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {module.order ?? index + 1}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-medium text-foreground" dir="auto">
              {primaryTitle}
            </p>
            {altTitle && altTitle !== primaryTitle ? (
              <p className="truncate text-xs text-muted-foreground" dir="auto">
                {altTitle}
              </p>
            ) : null}
            {summary ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={index === 0 || reordering}
            aria-label={t(`${KEY}.moveUp`)}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={index === total - 1 || reordering}
            aria-label={t(`${KEY}.moveDown`)}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            {t(`${KEY}.edit`)}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
            {t(`${KEY}.remove`)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function useModuleFieldError(name: keyof ModuleFormValues): string | undefined {
  const { t } = useTranslation();
  const {
    formState: { errors },
  } = useFormContext<ModuleFormValues>();
  const message = (errors as Record<string, { message?: string } | undefined>)[name]?.message;
  return message ? t(message, { defaultValue: message }) : undefined;
}

function ModuleField({
  name,
  labelKey,
  required,
  dir,
}: {
  name: keyof ModuleFormValues;
  labelKey: string;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
}) {
  const { t } = useTranslation();
  const { register } = useFormContext<ModuleFormValues>();
  const error = useModuleFieldError(name);
  const id = `module-${name}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {t(labelKey)}
        {required ? (
          <span aria-hidden="true" className="ms-1 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      <Input
        id={id}
        dir={dir}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ModuleTextArea({
  name,
  labelKey,
  dir,
}: {
  name: keyof ModuleFormValues;
  labelKey: string;
  dir?: 'ltr' | 'rtl';
}) {
  const { t } = useTranslation();
  const { register } = useFormContext<ModuleFormValues>();
  const error = useModuleFieldError(name);
  const id = `module-${name}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <Textarea
        id={id}
        dir={dir}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ModuleFormDialog({
  mode,
  module,
  onSave,
  onSuccess,
  onConflict,
  onCancel,
  demoSaving,
  demoInvalid,
}: {
  mode: 'add' | 'edit';
  module: CourseModule | null;
  onSave: (values: ModuleFormValues) => Promise<void>;
  onSuccess: () => void;
  onConflict: () => void;
  onCancel: () => void;
  demoSaving?: boolean;
  demoInvalid?: boolean;
}) {
  const { t } = useTranslation();
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: moduleToForm(module),
    mode: 'onBlur',
  });
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [genericError, setGenericError] = useState(false);

  useEffect(() => {
    // Run real validation so the demo mirrors a failed submit on an empty title.
    if (demoInvalid) void form.trigger('titleEn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoInvalid]);

  const submit = form.handleSubmit(async (values) => {
    setUnmapped([]);
    setGenericError(false);
    try {
      await onSave(values);
      onSuccess();
    } catch (err) {
      if (isConcurrencyError(err)) {
        onConflict();
        return;
      }
      const mapped = mapModuleServerErrors(err);
      if (mapped) {
        mapped.fields.forEach((f) => form.setError(f.field, { message: f.message }));
        setUnmapped(mapped.unmapped);
        return;
      }
      setGenericError(true);
    }
  });

  const base = `${KEY}.dialog`;
  const saving = Boolean(demoSaving) || form.formState.isSubmitting;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !saving) onCancel();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(mode === 'add' ? `${base}.addTitle` : `${base}.editTitle`)}</DialogTitle>
          <DialogDescription>
            {t(mode === 'add' ? `${base}.addBody` : `${base}.editBody`)}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModuleField name="titleEn" labelKey={`${KEY}.fields.titleEn`} required dir="ltr" />
              <ModuleField name="titleAr" labelKey={`${KEY}.fields.titleAr`} dir="rtl" />
            </div>
            <ModuleTextArea name="summaryEn" labelKey={`${KEY}.fields.summaryEn`} dir="ltr" />
            <ModuleTextArea name="summaryAr" labelKey={`${KEY}.fields.summaryAr`} dir="rtl" />

            {genericError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {t(`${KEY}.error.generic`)}
              </p>
            ) : null}
            {unmapped.length > 0 ? (
              <ul
                role="alert"
                className="list-inside list-disc rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {unmapped.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                {t(`${base}.cancel`)}
              </Button>
              <Button type="submit" disabled={saving || !form.formState.isDirty}>
                {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {saving ? t(`${base}.saving`) : t(`${base}.save`)}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function RemoveModuleDialog({
  module,
  lang,
  pending,
  onConfirm,
  onCancel,
}: {
  module: CourseModule;
  lang: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const title = bilingual(module.titleEn, module.titleAr, lang) || t(`${KEY}.noTitle`);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`${KEY}.removeDialog.title`)}</DialogTitle>
          <DialogDescription>{t(`${KEY}.removeDialog.body`)}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-surface/40 p-3 text-sm font-medium text-foreground">
          <span dir="auto">{title}</span>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {t(`${KEY}.dialog.cancel`)}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            {pending ? t(`${KEY}.removeDialog.working`) : t(`${KEY}.removeDialog.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { FolderPlus, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ApiError, isConcurrencyError } from '@/lib/api/errors';
import {
  useAdminCategory,
  useCreateCategory,
  useUpdateCategory,
} from '@/features/staff/catalog/api';
import type { AdminCategoryDetail } from '@/lib/api/admin/categories';
import { ConcurrencyAlert } from '../courses/ConcurrencyAlert';
import {
  categoryFormSchema,
  createCategoryDefaults,
  detailToForm,
  formToCreateBody,
  formToUpdateBody,
  mapCategoryServerErrors,
  type CategoryFormValues,
} from './category-form';
import type { CategoryListItem } from './format';

const KEY = 'staff.catalog.categories';
const FORM = `${KEY}.form`;

export type CategoryFormResult = 'created' | 'updated';

/** Dev-only overrides that force form states for visual QA (live path omits it). */
export interface CategoryFormDemo {
  detail?: AdminCategoryDetail;
  saving?: boolean;
  invalid?: boolean;
  conflict?: boolean;
}

export interface CategoryFormDialogProps {
  mode: 'create' | 'edit';
  /** Selected list item (edit only) — supplies the id and a header hint. */
  category?: CategoryListItem;
  onDone: (result: CategoryFormResult) => void;
  onCancel: () => void;
  demo?: CategoryFormDemo;
}

/**
 * Create / edit category dialog. In edit mode it fetches the full category
 * detail (`useAdminCategory`) so the description fields and the freshest
 * `rowVersion` are available — editing from the list item alone would blank the
 * descriptions on save. A 409 concurrency conflict shows the shared
 * ConcurrencyAlert with a reload of the server's latest copy; a 409 slug clash
 * maps to the slug field; a 400 maps per-field. Never an auto-retry or silent
 * overwrite.
 */
export function CategoryFormDialog({
  mode,
  category,
  onDone,
  onCancel,
  demo,
}: CategoryFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = mode === 'edit';

  const detailQuery = useAdminCategory(isEdit && !demo ? category?.id : undefined);
  const detail = demo?.detail ?? detailQuery.data;

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: createCategoryDefaults(),
    mode: 'onBlur',
  });

  const appliedRef = useRef<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [summaryKey, setSummaryKey] = useState<string | null>(null);
  const [unmapped, setUnmapped] = useState<string[]>([]);

  // Seed / reset the edit form when the detail (re)loads. Keyed on rowVersion so
  // a reload-after-conflict re-applies the server's latest copy (never a merge).
  useEffect(() => {
    if (!isEdit || !detail) return;
    const rv = detail.rowVersion ?? '';
    if (appliedRef.current === rv) return;
    form.reset(detailToForm(detail));
    appliedRef.current = rv;
    setConflict(false);
    setSummaryKey(null);
    setUnmapped([]);
  }, [isEdit, detail, form]);

  useEffect(() => {
    if (demo?.invalid) void form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const saving = demo?.saving ?? (createMutation.isPending || updateMutation.isPending);
  const showConflict = demo?.conflict ?? conflict;
  const detailLoading = isEdit && !demo && detailQuery.isLoading;
  const detailErrored = isEdit && !demo && detailQuery.isError;

  const submit = form.handleSubmit(async (values) => {
    setSummaryKey(null);
    setUnmapped([]);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: category?.id ?? '',
          body: formToUpdateBody(values, detail?.rowVersion),
        });
        onDone('updated');
      } else {
        await createMutation.mutateAsync(formToCreateBody(values));
        onDone('created');
      }
    } catch (err) {
      if (isEdit && isConcurrencyError(err)) {
        setConflict(true);
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        form.setError('slug', { message: `${FORM}.validation.slugTaken` });
        setSummaryKey(`${FORM}.error.slugTaken`);
        return;
      }
      const mapped = mapCategoryServerErrors(err);
      if (mapped) {
        mapped.fields.forEach((f) => form.setError(f.field, { message: f.message }));
        setUnmapped(mapped.unmapped);
        setSummaryKey(`${FORM}.error.validation`);
        return;
      }
      setSummaryKey(`${FORM}.error.generic`);
    }
  });

  const reloadLatest = () => {
    setConflict(false);
    if (!demo) void detailQuery.refetch();
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !saving) onCancel();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? `${FORM}.editTitle` : `${FORM}.createTitle`)}</DialogTitle>
          <DialogDescription>
            {t(isEdit ? `${FORM}.editBody` : `${FORM}.createBody`)}
          </DialogDescription>
        </DialogHeader>

        {detailLoading ? (
          <FormLoading />
        ) : detailErrored ? (
          <div className="space-y-4">
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {t(`${FORM}.loadError`)}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                {t(`${FORM}.cancel`)}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={submit} className="space-y-5" noValidate>
              {showConflict ? (
                <ConcurrencyAlert
                  titleKey="staff.catalog.categories.concurrency.title"
                  bodyKey="staff.catalog.categories.concurrency.body"
                  reloadKey="staff.catalog.categories.concurrency.reload"
                  onReload={reloadLatest}
                />
              ) : null}

              {summaryKey ? (
                <div
                  role="alert"
                  className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {t(`${FORM}.error.summaryTitle`)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(summaryKey)}</p>
                  {unmapped.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {unmapped.map((message, i) => (
                        <li key={i}>{message}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <CategoryField
                  name="nameEn"
                  labelKey={`${FORM}.fields.nameEn`}
                  required
                  dir="ltr"
                  disabled={saving}
                />
                <CategoryField
                  name="nameAr"
                  labelKey={`${FORM}.fields.nameAr`}
                  dir="rtl"
                  disabled={saving}
                />
              </div>

              <CategoryTextArea
                name="descriptionEn"
                labelKey={`${FORM}.fields.descriptionEn`}
                dir="ltr"
                disabled={saving}
              />
              <CategoryTextArea
                name="descriptionAr"
                labelKey={`${FORM}.fields.descriptionAr`}
                dir="rtl"
                disabled={saving}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <CategoryField
                  name="slug"
                  labelKey={`${FORM}.fields.slug`}
                  hintKey={`${FORM}.hints.slug`}
                  dir="ltr"
                  disabled={saving}
                />
                <CategoryField
                  name="icon"
                  labelKey={`${FORM}.fields.icon`}
                  hintKey={`${FORM}.hints.icon`}
                  dir="ltr"
                  disabled={saving}
                />
              </div>

              <div className="sm:max-w-[12rem]">
                <CategoryNumberField
                  name="order"
                  labelKey={`${FORM}.fields.order`}
                  hintKey={`${FORM}.hints.order`}
                  disabled={saving}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                  {t(`${FORM}.cancel`)}
                </Button>
                <Button type="submit" disabled={saving || (isEdit && !form.formState.isDirty)}>
                  {saving ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : isEdit ? (
                    <Save aria-hidden="true" />
                  ) : (
                    <FolderPlus aria-hidden="true" />
                  )}
                  {saving ? t(`${FORM}.saving`) : t(isEdit ? `${FORM}.saveEdit` : `${FORM}.create`)}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-4 py-2">
      <span className="sr-only">{t(`${FORM}.loading`)}</span>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function useCategoryFieldError(name: keyof CategoryFormValues): string | undefined {
  const { t } = useTranslation();
  const {
    formState: { errors },
  } = useFormContext<CategoryFormValues>();
  const message = (errors as Record<string, { message?: string } | undefined>)[name]?.message;
  return message ? t(message, { defaultValue: message }) : undefined;
}

interface ShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, error, hint, required, children }: ShellProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ms-1 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface FieldProps {
  name: keyof CategoryFormValues;
  labelKey: string;
  hintKey?: string;
  required?: boolean;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
}

function CategoryField({ name, labelKey, hintKey, required, disabled, dir }: FieldProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<CategoryFormValues>();
  const error = useCategoryFieldError(name);
  const id = `category-${name}`;
  return (
    <FieldShell
      id={id}
      label={t(labelKey)}
      error={error}
      hint={hintKey ? t(hintKey) : undefined}
      required={required}
    >
      <Input
        id={id}
        dir={dir}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hintKey ? `${id}-hint` : undefined}
        {...register(name)}
      />
    </FieldShell>
  );
}

function CategoryTextArea({ name, labelKey, disabled, dir }: FieldProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<CategoryFormValues>();
  const error = useCategoryFieldError(name);
  const id = `category-${name}`;
  return (
    <FieldShell id={id} label={t(labelKey)} error={error}>
      <Textarea
        id={id}
        dir={dir}
        rows={3}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
    </FieldShell>
  );
}

function CategoryNumberField({ name, labelKey, hintKey, disabled }: FieldProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<CategoryFormValues>();
  const error = useCategoryFieldError(name);
  const id = `category-${name}`;
  return (
    <FieldShell id={id} label={t(labelKey)} error={error} hint={hintKey ? t(hintKey) : undefined}>
      <Input
        id={id}
        type="number"
        min={0}
        max={9999}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hintKey ? `${id}-hint` : undefined}
        {...register(name)}
      />
    </FieldShell>
  );
}

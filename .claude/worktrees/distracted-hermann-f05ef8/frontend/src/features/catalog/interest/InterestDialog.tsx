import { useEffect, useState, type ReactNode } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
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
import { submitCatalogInterest, type CatalogInterestSourceType } from '@/lib/api/catalog-interest';
import {
  formToInterestBody,
  interestDefaults,
  interestFormSchema,
  type InterestFormValues,
} from './interest-form';

const KEY = 'catalog.interest';
const FORM = `${KEY}.form`;

export interface InterestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: CatalogInterestSourceType;
  sourceSlug: string;
  /** Localized title shown in the dialog header for context. */
  sourceTitle?: string;
  /** Dev-only: render the success state for visual QA (live path omits it). */
  demoSubmitted?: boolean;
}

/**
 * "Register interest" dialog for the public catalog. Honest, pre-commerce:
 * collects minimal contact details so staff can follow up when enrollment
 * opens. It grants no access, reserves no seat, and takes no payment — the copy
 * says so. Bilingual, keyboard-usable, with loading / success / safe-error
 * states. `preferredLanguage` is inferred from the active locale, so the form
 * stays short.
 */
export function InterestDialog({
  open,
  onOpenChange,
  sourceType,
  sourceSlug,
  sourceTitle,
  demoSubmitted,
}: InterestDialogProps) {
  const { t, i18n } = useTranslation();
  const [submitted, setSubmitted] = useState(demoSubmitted ?? false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const form = useForm<InterestFormValues>({
    resolver: zodResolver(interestFormSchema),
    defaultValues: interestDefaults(),
    mode: 'onBlur',
  });

  const mutation = useMutation({
    mutationFn: (values: InterestFormValues) =>
      submitCatalogInterest(formToInterestBody(values, sourceType, sourceSlug, i18n.language)),
    onSuccess: () => setSubmitted(true),
    onError: () => setErrorKey(`${FORM}.error.generic`),
  });

  // Reset to a clean form each time the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setSubmitted(demoSubmitted ?? false);
      setErrorKey(null);
      form.reset(interestDefaults());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saving = mutation.isPending;

  const submit = form.handleSubmit((values) => {
    setErrorKey(null);
    mutation.mutate(values);
  });

  const title = sourceType === 'course' ? `${KEY}.course.title` : `${KEY}.path.title`;
  const body = sourceType === 'course' ? `${KEY}.course.body` : `${KEY}.path.body`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && saving) return; // don't close mid-submit
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
          <DialogDescription>
            {t(body)}
            {sourceTitle ? (
              <>
                {' '}
                <span className="font-medium text-foreground" dir="auto">
                  {sourceTitle}
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div role="status" aria-live="polite" className="space-y-4 py-2 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 aria-hidden="true" className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">{t(`${KEY}.success.title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`${KEY}.success.body`)}</p>
              <p className="text-xs text-muted-foreground">{t(`${KEY}.success.note`)}</p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t(`${KEY}.success.close`)}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={submit} className="space-y-4" noValidate>
              {errorKey ? (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {t(errorKey)}
                </p>
              ) : null}

              <Field
                name="parentName"
                labelKey={`${FORM}.fields.parentName`}
                required
                disabled={saving}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="phone"
                  labelKey={`${FORM}.fields.phone`}
                  type="tel"
                  dir="ltr"
                  required
                  disabled={saving}
                />
                <Field
                  name="email"
                  labelKey={`${FORM}.fields.email`}
                  type="email"
                  dir="ltr"
                  disabled={saving}
                />
              </div>
              <div className="sm:max-w-[10rem]">
                <Field
                  name="childAge"
                  labelKey={`${FORM}.fields.childAge`}
                  type="number"
                  dir="ltr"
                  disabled={saving}
                />
              </div>
              <FieldArea name="notes" labelKey={`${FORM}.fields.notes`} disabled={saving} />

              <p className="text-xs text-muted-foreground">{t(`${KEY}.disclaimer`)}</p>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  {t(`${FORM}.cancel`)}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                  {saving ? t(`${FORM}.submitting`) : t(`${FORM}.submit`)}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Fields -----------------------------------------------------------------

interface FieldProps {
  name: keyof InterestFormValues;
  labelKey: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  dir?: 'ltr' | 'rtl';
}

function useFieldError(name: keyof InterestFormValues): string | undefined {
  const { t } = useTranslation();
  const {
    formState: { errors },
  } = useFormContext<InterestFormValues>();
  const message = (errors as Record<string, { message?: string } | undefined>)[name]?.message;
  return message ? t(message, { defaultValue: message }) : undefined;
}

function Shell({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
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
      ) : null}
    </div>
  );
}

function Field({ name, labelKey, required, disabled, type, dir }: FieldProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<InterestFormValues>();
  const error = useFieldError(name);
  const id = `interest-${name}`;
  return (
    <Shell id={id} label={t(labelKey)} required={required} error={error}>
      <Input
        id={id}
        type={type}
        dir={dir}
        inputMode={type === 'tel' ? 'tel' : type === 'number' ? 'numeric' : undefined}
        min={type === 'number' ? 3 : undefined}
        max={type === 'number' ? 18 : undefined}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
    </Shell>
  );
}

function FieldArea({ name, labelKey, disabled }: FieldProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<InterestFormValues>();
  const error = useFieldError(name);
  const id = `interest-${name}`;
  return (
    <Shell id={id} label={t(labelKey)} error={error}>
      <Textarea
        id={id}
        rows={3}
        dir="auto"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
    </Shell>
  );
}

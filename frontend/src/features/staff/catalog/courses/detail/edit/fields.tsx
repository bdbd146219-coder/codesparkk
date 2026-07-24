import type { ReactNode } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { CourseFormValues } from './course-form';

type StringField =
  | 'slug'
  | 'thumbnailKey'
  | 'thumbnailAlt'
  | 'heroKey'
  | 'promoVideoUrl'
  | 'titleEn'
  | 'titleAr'
  | 'subtitleEn'
  | 'subtitleAr'
  | 'summaryEn'
  | 'summaryAr'
  | 'descriptionEn'
  | 'descriptionAr';

type NumberField = 'minAge' | 'maxAge';
type SelectField = 'deliveryType' | 'difficulty' | 'ageBand' | 'primaryCategoryId';

const selectClass = cn(
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm',
  'transition-colors duration-fast',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

function useFieldError(name: keyof CourseFormValues): string | undefined {
  const { t } = useTranslation();
  const {
    formState: { errors },
  } = useFormContext<CourseFormValues>();
  const entry = (errors as Record<string, { message?: string } | undefined>)[name];
  const message = entry?.message;
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

interface TextFieldProps {
  name: StringField;
  labelKey: string;
  hintKey?: string;
  required?: boolean;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
}

export function TextField({ name, labelKey, hintKey, required, disabled, dir }: TextFieldProps) {
  const { t } = useTranslation();
  const { register } = useFormContext<CourseFormValues>();
  const error = useFieldError(name);
  return (
    <FieldShell
      id={name}
      label={t(labelKey)}
      error={error}
      hint={hintKey ? t(hintKey) : undefined}
      required={required}
    >
      <Input
        id={name}
        dir={dir}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hintKey ? `${name}-hint` : undefined}
        {...register(name)}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  labelKey,
  hintKey,
  disabled,
  dir,
  rows,
}: TextFieldProps & { rows?: number }) {
  const { t } = useTranslation();
  const { register } = useFormContext<CourseFormValues>();
  const error = useFieldError(name);
  return (
    <FieldShell id={name} label={t(labelKey)} error={error} hint={hintKey ? t(hintKey) : undefined}>
      <Textarea
        id={name}
        dir={dir}
        rows={rows}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...register(name)}
      />
    </FieldShell>
  );
}

export function NumberField({
  name,
  labelKey,
  disabled,
}: {
  name: NumberField;
  labelKey: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { register } = useFormContext<CourseFormValues>();
  const error = useFieldError(name);
  return (
    <FieldShell id={name} label={t(labelKey)} error={error} required>
      <Input
        id={name}
        type="number"
        min={0}
        max={120}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...register(name)}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  labelKey,
  options,
  disabled,
  required,
}: {
  name: SelectField;
  labelKey: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  required?: boolean;
}) {
  const { t } = useTranslation();
  const { register } = useFormContext<CourseFormValues>();
  const error = useFieldError(name);
  return (
    <FieldShell id={name} label={t(labelKey)} error={error} required={required}>
      <select
        id={name}
        disabled={disabled}
        className={selectClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...register(name)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function SwitchField({
  name,
  labelKey,
  descriptionKey,
  disabled,
}: {
  name: 'isListed';
  labelKey: string;
  descriptionKey?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { control } = useFormContext<CourseFormValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
            {descriptionKey ? (
              <p className="text-xs text-muted-foreground">{t(descriptionKey)}</p>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(field.value)}
            aria-label={t(labelKey)}
            disabled={disabled}
            onClick={() => field.onChange(!field.value)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
              field.value ? 'bg-accent' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'inline-block size-5 rounded-full bg-background shadow transition-transform duration-fast',
                field.value
                  ? 'translate-x-5 rtl:-translate-x-5'
                  : 'translate-x-0.5 rtl:-translate-x-0.5',
              )}
            />
          </button>
        </div>
      )}
    />
  );
}

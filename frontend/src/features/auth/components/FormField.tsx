import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  id: string;
  /** i18n key for the field label. */
  labelKey: string;
  /** i18n key for the inline error (takes precedence over hint). */
  errorKey?: string;
  /** i18n key for a small hint shown when there is no error. */
  hintKey?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ id, labelKey, errorKey, hintKey, required, children }: FormFieldProps) {
  const { t } = useTranslation();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
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
      {children}
      {errorKey ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {t(errorKey)}
        </p>
      ) : hintKey ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {t(hintKey)}
        </p>
      ) : null}
    </div>
  );
}

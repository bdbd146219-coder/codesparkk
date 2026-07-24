import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatalogImage } from '@/components/catalog';
import { useUploadCatalogMedia } from '@/features/staff/catalog/api';
import type { CatalogMediaKind } from '@/lib/api/admin/media';

const KEY = 'staff.catalog.media';

/** Image MIME types the admin upload accepts (mirrors the backend allow-list). */
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

export interface MediaUploadFieldProps {
  /** Upload kind the backend expects. */
  kind: CatalogMediaKind;
  /** RHF field name holding the storage key (written on successful upload). */
  keyField: string;
  /** RHF field name providing an optional slug context for the generated key. */
  contextField?: string;
  /** i18n key for the control's label. */
  labelKey: string;
  /** Preview fallback flavour (icon + localized alt) when no image resolves. */
  previewKind: 'course' | 'path';
  disabled?: boolean;
}

/**
 * Additive admin media control: previews the current image (via the shared
 * `CatalogImage`, which resolves the stored key through the public media base
 * and falls back to the branded tile), and lets staff upload a replacement. On
 * a successful upload the returned storage key is written into the form field —
 * the existing key/alt inputs stay, so manual editing and clearing still work —
 * and persisted with the normal course / learning-path save. The raw disk path
 * is never shown; validation errors are safe and localized.
 */
export function MediaUploadField({
  kind,
  keyField,
  contextField,
  labelKey,
  previewKind,
  disabled,
}: MediaUploadFieldProps) {
  const { t } = useTranslation();
  const { watch, setValue } = useFormContext();
  const upload = useUploadCatalogMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const statusId = useId();
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const currentKey = ((watch(keyField) as string | undefined) ?? '').trim();
  const context = contextField ? ((watch(contextField) as string | undefined) ?? '') : undefined;
  const busy = upload.isPending;
  const locked = Boolean(disabled) || busy;

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow re-selecting the same file later.
    event.target.value = '';
    if (!file) return;

    setError(null);
    setUploaded(false);

    // Client-side pre-checks give fast, localized feedback; the server re-checks
    // authoritatively by sniffing the bytes.
    if (file.type && !ACCEPTED.includes(file.type)) {
      setError(t(`${KEY}.upload.errors.type`));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t(`${KEY}.upload.errors.size`));
      return;
    }

    upload.mutate(
      { file, kind, context: context || undefined },
      {
        onSuccess: (result) => {
          setValue(keyField, result.key, { shouldDirty: true, shouldValidate: true });
          setUploaded(true);
        },
        onError: () => setError(t(`${KEY}.upload.errors.failed`)),
      },
    );
  };

  const clear = () => {
    setError(null);
    setUploaded(false);
    setValue(keyField, '', { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-2">
      <p id={labelId} className="text-sm font-medium text-foreground">
        {t(labelKey)}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CatalogImage
          mediaKey={currentKey || null}
          alt={t(`${KEY}.previewAlt`, { defaultValue: '' })}
          kind={previewKind}
          icon={ImageIcon}
          className="aspect-video w-full shrink-0 rounded-lg border border-border sm:w-40"
          iconClassName="size-8"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            aria-labelledby={labelId}
            aria-describedby={statusId}
            disabled={locked}
            onChange={onPick}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={locked}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Upload aria-hidden="true" />
              )}
              {busy
                ? t(`${KEY}.upload.uploading`)
                : currentKey
                  ? t(`${KEY}.upload.replace`)
                  : t(`${KEY}.upload.action`)}
            </Button>
            {currentKey ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={locked}
                onClick={clear}
                className="text-muted-foreground"
              >
                <Trash2 aria-hidden="true" />
                {t(`${KEY}.upload.remove`)}
              </Button>
            ) : null}
          </div>
          <div id={statusId} aria-live="polite" className="min-h-4 space-y-1">
            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : uploaded ? (
              <p className="text-xs text-success">{t(`${KEY}.upload.uploaded`)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t(`${KEY}.upload.hint`)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

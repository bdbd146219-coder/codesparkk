import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Power, PowerOff, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isConcurrencyError } from '@/lib/api/errors';
import { useActivateCategory, useDeactivateCategory } from '@/features/staff/catalog/api';
import { categoryName, type CategoryListItem } from './format';

const KEY = 'staff.catalog.categories.statusDialog';

export interface StatusChangeDialogProps {
  category: CategoryListItem;
  lang: string;
  onDone: (action: 'activated' | 'deactivated') => void;
  onConflict: () => void;
  onCancel: () => void;
  /** Dev-only busy override for visual QA (live path omits it). */
  demoBusy?: boolean;
}

/**
 * Activate / deactivate confirmation. The action is derived from the category's
 * current state; deactivation carries an impact note (hidden from public
 * filters, existing courses untouched). Uses alert-dialog semantics. A 409
 * concurrency conflict bubbles up so the list refetches — never an auto-retry.
 */
export function StatusChangeDialog({
  category,
  lang,
  onDone,
  onConflict,
  onCancel,
  demoBusy,
}: StatusChangeDialogProps) {
  const { t } = useTranslation();
  const activate = useActivateCategory();
  const deactivate = useDeactivateCategory();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const deactivating = category.isActive === true;
  const base = `${KEY}.${deactivating ? 'deactivate' : 'activate'}`;
  const name = categoryName(category, lang);
  const mutation = deactivating ? deactivate : activate;
  const pending = demoBusy ?? mutation.isPending;

  const confirm = () => {
    setErrorKey(null);
    mutation.mutate(
      { id: category.id ?? '', body: { rowVersion: category.rowVersion ?? '' } },
      {
        onSuccess: () => onDone(deactivating ? 'deactivated' : 'activated'),
        onError: (err) => {
          if (isConcurrencyError(err)) {
            onConflict();
            return;
          }
          setErrorKey(`${KEY}.error.generic`);
        },
      },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent role="alertdialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`${base}.title`)}</DialogTitle>
          <DialogDescription>{t(`${base}.body`)}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-surface/40 p-3 text-sm font-medium text-foreground">
          <span dir="auto">{name}</span>
        </div>

        {deactivating ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-warning-foreground"
            />
            <p>{t(`${KEY}.deactivate.impact`)}</p>
          </div>
        ) : null}

        {errorKey ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {t(errorKey)}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {t(`${KEY}.cancel`)}
          </Button>
          <Button
            type="button"
            variant={deactivating ? 'destructive' : 'primary'}
            onClick={confirm}
            disabled={pending}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : deactivating ? (
              <PowerOff aria-hidden="true" />
            ) : (
              <Power aria-hidden="true" />
            )}
            {pending ? t(`${KEY}.working`) : t(`${base}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

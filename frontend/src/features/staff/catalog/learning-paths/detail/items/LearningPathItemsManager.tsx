import { useEffect, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from 'lucide-react';
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
import { ApiError, isConcurrencyError } from '@/lib/api/errors';
import {
  useAddLearningPathItem,
  useRemoveLearningPathItem,
  useReorderLearningPathItems,
} from '@/features/staff/catalog/api';
import { PublishStateBadge } from '../../../courses/badges';
import { ConcurrencyAlert } from '../../../courses/ConcurrencyAlert';
import {
  itemTitle,
  sortedItems,
  type AdminLearningPathDetail,
  type LearningPathItem,
} from '../detail-helpers';
import {
  addItemDefaults,
  addItemFormSchema,
  formToAddItemBody,
  itemErrorKey,
  mapAddItemServerErrors,
  moveItemIds,
  type AddItemFormValues,
  type ItemsDemo,
} from './items';

const KEY = 'staff.catalog.learningPaths.detail.items';
const CKEY = 'staff.catalog.learningPaths.edit.concurrency';

export interface LearningPathItemsManagerProps {
  path: AdminLearningPathDetail;
  onReloadLatest: () => void;
  /** Dev-only display overrides for visual QA (live path never passes this). */
  demo?: ItemsDemo;
}

/**
 * Functional Items tab (C3E). Add / remove course items and reorder them with
 * move up/down (no drag-and-drop in V1). Every mutation carries the current path
 * rowVersion; the hooks return the full path detail and seed the cache, so the
 * list and the publish-readiness checklist update together. 409 surfaces the
 * shared ConcurrencyAlert with a reload — never an auto-retry or silent
 * overwrite. Archived paths are read-only (the backend rejects item edits).
 */
export function LearningPathItemsManager({
  path,
  onReloadLatest,
  demo,
}: LearningPathItemsManagerProps) {
  const { t } = useTranslation();
  const items = sortedItems(path);
  const archived = path.publishState === 'Archived';

  const addItem = useAddLearningPathItem();
  const removeItem = useRemoveLearningPathItem();
  const reorderItems = useReorderLearningPathItems();

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<LearningPathItem | null>(null);
  const [feedback, setFeedback] = useState<'added' | 'removed' | 'reordered' | null>(null);
  const [conflict, setConflict] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Fresh server data (reload / the refetch after a successful mutation) clears
  // transient error state; success feedback is intentionally left sticky.
  useEffect(() => {
    setConflict(false);
    setErrorKey(null);
  }, [path.rowVersion]);

  const pathId = path.id ?? '';
  const rowVersion = path.rowVersion ?? null;

  const clearTransient = () => {
    setFeedback(null);
    setConflict(false);
    setErrorKey(null);
  };

  const openAdd = () => {
    clearTransient();
    setAddOpen(true);
  };

  // add save — rejects with the ApiError so the dialog can map 404/409/400;
  // success closes the dialog and records feedback here.
  const saveAdd = async (values: AddItemFormValues) => {
    clearTransient();
    await addItem.mutateAsync({ id: pathId, body: formToAddItemBody(values, rowVersion) });
    setFeedback('added');
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    clearTransient();
    removeItem.mutate(
      { id: pathId, itemId: removeTarget.id ?? '', body: { rowVersion } },
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
          setErrorKey(itemErrorKey(err));
        },
      },
    );
  };

  const move = (index: number, direction: 'up' | 'down') => {
    const orderedItemIds = moveItemIds(items, index, direction);
    if (!orderedItemIds) return;
    clearTransient();
    reorderItems.mutate(
      { id: pathId, body: { rowVersion, orderedItemIds } },
      {
        onSuccess: () => setFeedback('reordered'),
        onError: (err) => {
          if (isConcurrencyError(err)) {
            setConflict(true);
            return;
          }
          setErrorKey(itemErrorKey(err));
        },
      },
    );
  };

  const handleReload = () => {
    setConflict(false);
    setErrorKey(null);
    setAddOpen(false);
    setRemoveTarget(null);
    onReloadLatest();
  };

  // Demo overrides for visual QA — the live path leaves `demo` undefined.
  const renderAdd = demo?.dialog ? true : addOpen;
  const renderRemove = demo?.remove ? (items[0] ?? null) : removeTarget;
  const showConflict = demo?.conflict ?? conflict;
  const activeFeedback = demo?.feedback ?? feedback;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{t(`${KEY}.heading`)}</h2>
          <p className="text-sm text-muted-foreground">{t(`${KEY}.lead`)}</p>
        </div>
        {items.length > 0 && !archived ? (
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

      {showConflict ? (
        <ConcurrencyAlert
          titleKey={`${CKEY}.title`}
          bodyKey={`${CKEY}.body`}
          reloadKey={`${CKEY}.reload`}
          onReload={handleReload}
        />
      ) : null}

      {errorKey ? (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="text-sm font-semibold text-foreground">{t(`${KEY}.error.title`)}</p>
          <p className="text-sm text-muted-foreground">{t(errorKey)}</p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">{t(`${KEY}.empty`)}</p>
            {!archived ? (
              <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                <Plus aria-hidden="true" />
                {t(`${KEY}.add`)}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id ?? item.courseId ?? index}>
              <ItemCard
                item={item}
                index={index}
                total={items.length}
                disabled={archived}
                reordering={reorderItems.isPending}
                onRemove={() => {
                  clearTransient();
                  setRemoveTarget(item);
                }}
                onMoveUp={() => move(index, 'up')}
                onMoveDown={() => move(index, 'down')}
              />
            </li>
          ))}
        </ol>
      )}

      {renderAdd ? (
        <AddItemDialog
          onSave={saveAdd}
          onSuccess={() => setAddOpen(false)}
          onConflict={() => {
            setAddOpen(false);
            setConflict(true);
          }}
          onCancel={() => setAddOpen(false)}
          demoSaving={demo?.saving}
          demoInvalid={demo?.invalid}
          demoError={demo?.duplicate ? 'duplicate' : demo?.notFound ? 'notFound' : undefined}
        />
      ) : null}

      {renderRemove ? (
        <RemoveItemDialog
          item={renderRemove}
          pending={demo?.remove ? Boolean(demo.saving) : removeItem.isPending}
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      ) : null}
    </div>
  );
}

function ItemCard({
  item,
  index,
  total,
  disabled,
  reordering,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: LearningPathItem;
  index: number;
  total: number;
  disabled: boolean;
  reordering: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation();
  const title = itemTitle(item);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums text-secondary-foreground">
            {item.order ?? index + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 break-words font-medium text-foreground" dir="auto">
                {title}
              </p>
              <PublishStateBadge value={item.coursePublishState} />
            </div>
            {item.courseSlug ? (
              <p className="text-xs text-muted-foreground">
                <bdi dir="ltr">{item.courseSlug}</bdi>
              </p>
            ) : null}
            {item.note?.trim() ? (
              <p className="text-sm text-muted-foreground" dir="auto">
                <span className="font-medium">{t(`${KEY}.note`)}:</span> {item.note}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={disabled || index === 0 || reordering}
            aria-label={t(`${KEY}.moveUp`)}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={disabled || index === total - 1 || reordering}
            aria-label={t(`${KEY}.moveDown`)}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
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

function useItemFieldError(name: keyof AddItemFormValues): string | undefined {
  const { t } = useTranslation();
  const {
    formState: { errors },
  } = useFormContext<AddItemFormValues>();
  const message = (errors as Record<string, { message?: string } | undefined>)[name]?.message;
  return message ? t(message, { defaultValue: message }) : undefined;
}

function AddItemDialog({
  onSave,
  onSuccess,
  onConflict,
  onCancel,
  demoSaving,
  demoInvalid,
  demoError,
}: {
  onSave: (values: AddItemFormValues) => Promise<void>;
  onSuccess: () => void;
  onConflict: () => void;
  onCancel: () => void;
  demoSaving?: boolean;
  demoInvalid?: boolean;
  demoError?: 'duplicate' | 'notFound';
}) {
  const { t } = useTranslation();
  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(addItemFormSchema),
    defaultValues: addItemDefaults(),
    mode: 'onBlur',
  });
  const [summaryKey, setSummaryKey] = useState<string | null>(null);
  const [unmapped, setUnmapped] = useState<string[]>([]);

  useEffect(() => {
    if (demoInvalid) void form.trigger('courseId');
    if (demoError === 'duplicate') {
      form.setError('courseId', { message: `${KEY}.validation.duplicate` });
      setSummaryKey(`${KEY}.error.duplicate`);
    }
    if (demoError === 'notFound') {
      form.setError('courseId', { message: `${KEY}.validation.courseNotFound` });
      setSummaryKey(`${KEY}.error.courseNotFound`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoInvalid, demoError]);

  const submit = form.handleSubmit(async (values) => {
    setSummaryKey(null);
    setUnmapped([]);
    try {
      await onSave(values);
      onSuccess();
    } catch (err) {
      if (isConcurrencyError(err)) {
        onConflict();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        form.setError('courseId', { message: `${KEY}.validation.courseNotFound` });
        setSummaryKey(`${KEY}.error.courseNotFound`);
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        form.setError('courseId', { message: `${KEY}.validation.duplicate` });
        setSummaryKey(`${KEY}.error.duplicate`);
        return;
      }
      const mapped = mapAddItemServerErrors(err);
      if (mapped) {
        mapped.fields.forEach((f) => form.setError(f.field, { message: f.message }));
        setUnmapped(mapped.unmapped);
        setSummaryKey(`${KEY}.error.validation`);
        return;
      }
      setSummaryKey(`${KEY}.error.generic`);
    }
  });

  const saving = Boolean(demoSaving) || form.formState.isSubmitting;
  const base = `${KEY}.dialog`;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !saving) onCancel();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`${base}.title`)}</DialogTitle>
          <DialogDescription>{t(`${base}.body`)}</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <CourseIdField disabled={saving} />
            <NoteField disabled={saving} />

            {summaryKey ? (
              <div
                role="alert"
                className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3"
              >
                <p className="text-sm text-destructive">{t(summaryKey)}</p>
                {unmapped.length > 0 ? (
                  <ul className="list-inside list-disc text-sm text-destructive">
                    {unmapped.map((message, i) => (
                      <li key={i}>{message}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                {t(`${base}.cancel`)}
              </Button>
              <Button type="submit" disabled={saving || !form.formState.isDirty}>
                {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {saving ? t(`${base}.adding`) : t(`${base}.add`)}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function CourseIdField({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const { register } = useFormContext<AddItemFormValues>();
  const error = useItemFieldError('courseId');
  return (
    <div className="space-y-1.5">
      <Label htmlFor="item-course-id">
        {t(`${KEY}.fields.courseId`)}
        <span aria-hidden="true" className="ms-1 text-destructive">
          *
        </span>
      </Label>
      <Input
        id="item-course-id"
        dir="ltr"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'item-course-id-error' : 'item-course-id-hint'}
        {...register('courseId')}
      />
      {error ? (
        <p id="item-course-id-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id="item-course-id-hint" className="text-xs text-muted-foreground">
          {t(`${KEY}.fields.courseIdHint`)}
        </p>
      )}
    </div>
  );
}

function NoteField({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const { register } = useFormContext<AddItemFormValues>();
  const error = useItemFieldError('note');
  return (
    <div className="space-y-1.5">
      <Label htmlFor="item-note">{t(`${KEY}.fields.note`)}</Label>
      <Textarea
        id="item-note"
        rows={2}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'item-note-error' : undefined}
        {...register('note')}
      />
      {error ? (
        <p id="item-note-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RemoveItemDialog({
  item,
  pending,
  onConfirm,
  onCancel,
}: {
  item: LearningPathItem;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const title = itemTitle(item);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent role="alertdialog" className="max-w-md">
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

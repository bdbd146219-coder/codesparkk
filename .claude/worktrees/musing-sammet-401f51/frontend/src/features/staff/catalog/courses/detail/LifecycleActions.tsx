import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  CircleAlert,
  EyeOff,
  Loader2,
  Rocket,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isConcurrencyError, isPublishReadinessError } from '@/lib/api/errors';
import {
  useArchiveCourse,
  usePublishCourse,
  useRestoreCourse,
  useUnpublishCourse,
} from '@/features/staff/catalog/api';
import type { AdminCourseDetail } from '@/lib/api/admin/courses';
import { ConcurrencyAlert } from '../ConcurrencyAlert';
import { ReadinessItemsList } from './ReadinessChecklist';
import {
  isHighImpactAction,
  lifecycleActionsFor,
  lifecycleErrorKey,
  readinessFromError,
  type LifecycleAction,
  type LifecycleDemo,
  type PublishReadiness,
} from './lifecycle';

const KEY = 'staff.catalog.courses.detail.publishing';
const PUBLISH_HINT_ID = 'lifecycle-publish-hint';

const ACTION_ICON: Record<LifecycleAction, LucideIcon> = {
  publish: Rocket,
  unpublish: EyeOff,
  archive: Archive,
  restore: ArchiveRestore,
};

/** Calm on the page (positive actions primary, others outline); the destructive
 * accent is reserved for the confirm button inside the dialog. */
function pageVariant(action: LifecycleAction): ButtonProps['variant'] {
  return action === 'publish' || action === 'restore' ? 'primary' : 'outline';
}

export interface LifecycleActionsProps {
  course: AdminCourseDetail;
  onReloadLatest: () => void;
  /** Dev-only display overrides for visual QA (live path never passes this). */
  demo?: LifecycleDemo;
}

/**
 * Interactive lifecycle panel for the Publishing tab. Wires the publish /
 * unpublish / archive / restore mutations with confirmation dialogs, a stale
 * rowVersion (409) conflict path that offers a reload, a 422 publish-readiness
 * block, and inline success feedback. The server is the source of truth: each
 * action sends the current rowVersion and relies on the hook's cache
 * invalidation to refetch the detail — no optimistic state, no auto-retry.
 */
export function LifecycleActions({ course, onReloadLatest, demo }: LifecycleActionsProps) {
  const { t } = useTranslation();

  const mutations: Record<LifecycleAction, ReturnType<typeof usePublishCourse>> = {
    publish: usePublishCourse(),
    unpublish: useUnpublishCourse(),
    archive: useArchiveCourse(),
    restore: useRestoreCourse(),
  };

  const [openDialog, setOpenDialog] = useState<LifecycleAction | null>(null);
  const [feedback, setFeedback] = useState<LifecycleAction | null>(null);
  const [conflict, setConflict] = useState(false);
  const [blocked, setBlocked] = useState<PublishReadiness | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Fresh server data (e.g. after Reload latest, or the refetch that follows a
  // successful action) clears the transient error states. Success feedback is
  // intentionally left sticky so it survives that refetch.
  useEffect(() => {
    setConflict(false);
    setBlocked(null);
    setErrorKey(null);
  }, [course.rowVersion]);

  const specs = lifecycleActionsFor(course.publishState, Boolean(course.publishReadiness?.isReady));

  const run = (action: LifecycleAction) => {
    setFeedback(null);
    setConflict(false);
    setBlocked(null);
    setErrorKey(null);
    mutations[action].mutate(
      { id: course.id ?? '', body: { rowVersion: course.rowVersion ?? null } },
      {
        onSuccess: () => {
          setOpenDialog(null);
          setFeedback(action);
        },
        onError: (err) => {
          setOpenDialog(null);
          if (isConcurrencyError(err)) {
            setConflict(true);
            return;
          }
          if (action === 'publish' && isPublishReadinessError(err)) {
            setBlocked(
              readinessFromError(err) ?? course.publishReadiness ?? { isReady: false, items: [] },
            );
            return;
          }
          setErrorKey(lifecycleErrorKey(err));
        },
      },
    );
  };

  const handleReload = () => {
    setConflict(false);
    setErrorKey(null);
    setBlocked(null);
    onReloadLatest();
  };

  // Demo overrides for visual QA — the live path leaves `demo` undefined.
  const activeDialog = demo?.dialog ?? openDialog;
  const pendingDialog = demo?.dialog
    ? Boolean(demo.busy)
    : openDialog
      ? mutations[openDialog].isPending
      : false;
  const showConflict = demo?.conflict ?? conflict;
  const showBlocked = demo?.blocked ? (course.publishReadiness ?? null) : blocked;
  const activeFeedback = demo?.feedback ?? feedback;

  const publishDisabled = specs.some((s) => s.action === 'publish' && s.disabled);

  return (
    <div className="space-y-4">
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

      {showBlocked ? (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <div className="flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{t(`${KEY}.blocked.title`)}</p>
              <p className="text-sm text-muted-foreground">{t(`${KEY}.blocked.body`)}</p>
            </div>
          </div>
          {/* Only echo the list here when the standing readiness card above isn't
              already showing it — i.e. the course looked ready but the server
              blocked it — so we never render the same checklist twice. */}
          {course.publishReadiness?.isReady && (showBlocked.items?.length ?? 0) > 0 ? (
            <ReadinessItemsList items={showBlocked.items ?? []} />
          ) : null}
        </div>
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

      {specs.length > 0 ? (
        <div
          role="group"
          aria-label={t(`${KEY}.lifecycleHeading`)}
          className="flex flex-wrap gap-2"
        >
          {specs.map((spec) => {
            const Icon = ACTION_ICON[spec.action];
            return (
              <Button
                key={spec.action}
                type="button"
                variant={pageVariant(spec.action)}
                size="sm"
                disabled={spec.disabled}
                aria-describedby={spec.reason === 'notReady' ? PUBLISH_HINT_ID : undefined}
                onClick={() => setOpenDialog(spec.action)}
              >
                <Icon aria-hidden="true" />
                {t(`${KEY}.${spec.action}`)}
              </Button>
            );
          })}
        </div>
      ) : null}

      {publishDisabled ? (
        <p id={PUBLISH_HINT_ID} className="text-sm text-muted-foreground">
          {t(`${KEY}.publishDisabledHint`)}
        </p>
      ) : null}

      {activeDialog ? (
        <ConfirmDialog
          action={activeDialog}
          pending={pendingDialog}
          onConfirm={() => run(activeDialog)}
          onCancel={() => setOpenDialog(null)}
        />
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  action,
  pending,
  onConfirm,
  onCancel,
}: {
  action: LifecycleAction;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const base = `${KEY}.dialog.${action}`;
  const highImpact = isHighImpactAction(action);
  const Icon = ACTION_ICON[action];

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`${base}.title`)}</DialogTitle>
          <DialogDescription>{t(`${base}.body`)}</DialogDescription>
        </DialogHeader>

        {highImpact ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-warning-foreground"
            />
            <p>{t(`${base}.impact`)}</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {t(`${KEY}.dialog.cancel`)}
          </Button>
          <Button
            type="button"
            variant={highImpact ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Icon aria-hidden="true" />
            )}
            {pending ? t(`${KEY}.dialog.working`) : t(`${base}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

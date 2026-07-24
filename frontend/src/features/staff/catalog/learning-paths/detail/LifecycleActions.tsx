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
  useArchiveLearningPath,
  usePublishLearningPath,
  useRestoreLearningPath,
  useUnpublishLearningPath,
} from '@/features/staff/catalog/api';
import { ConcurrencyAlert } from '../../courses/ConcurrencyAlert';
import { ReadinessItemsList } from './ReadinessChecklist';
import type { AdminLearningPathDetail } from './detail-helpers';
import {
  isHighImpactAction,
  lifecycleActionSpecs,
  lifecycleErrorKey,
  readinessFromError,
  type LearningPathReadiness,
  type LifecycleAction,
  type LifecycleDemo,
} from './lifecycle';

const KEY = 'staff.catalog.learningPaths.detail.publishing';
const PUBLISH_HINT_ID = 'lp-lifecycle-publish-hint';

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
  path: AdminLearningPathDetail;
  onReloadLatest: () => void;
  /** Dev-only display overrides for visual QA (live path never passes this). */
  demo?: LifecycleDemo;
}

/**
 * Interactive lifecycle panel for the learning-path Publishing tab (C3F). Wires
 * publish / unpublish / archive / restore with confirmation dialogs, a stale
 * rowVersion (409) conflict path that offers a reload, a 422 publish-readiness
 * block, and inline success feedback. The server is the source of truth: each
 * action sends the current rowVersion and relies on the hook's cache
 * invalidation to refetch the detail — no optimistic state, no auto-retry.
 */
export function LifecycleActions({ path, onReloadLatest, demo }: LifecycleActionsProps) {
  const { t } = useTranslation();

  const mutations: Record<LifecycleAction, ReturnType<typeof usePublishLearningPath>> = {
    publish: usePublishLearningPath(),
    unpublish: useUnpublishLearningPath(),
    archive: useArchiveLearningPath(),
    restore: useRestoreLearningPath(),
  };

  const [openDialog, setOpenDialog] = useState<LifecycleAction | null>(null);
  const [feedback, setFeedback] = useState<LifecycleAction | null>(null);
  const [conflict, setConflict] = useState(false);
  const [blocked, setBlocked] = useState<LearningPathReadiness | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Fresh server data (Reload latest, or the refetch that follows a successful
  // action) clears the transient error states. Success feedback is intentionally
  // left sticky so it survives that refetch.
  useEffect(() => {
    setConflict(false);
    setBlocked(null);
    setErrorKey(null);
  }, [path.rowVersion]);

  const specs = lifecycleActionSpecs(path.publishState, Boolean(path.readiness?.isReady));

  const run = (action: LifecycleAction) => {
    setFeedback(null);
    setConflict(false);
    setBlocked(null);
    setErrorKey(null);
    mutations[action].mutate(
      { id: path.id ?? '', body: { rowVersion: path.rowVersion ?? null } },
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
            setBlocked(readinessFromError(err) ?? path.readiness ?? { isReady: false, items: [] });
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
  const showBlocked = demo?.blocked ? (path.readiness ?? null) : blocked;
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

      {showConflict ? (
        <ConcurrencyAlert
          titleKey={`${KEY}.concurrency.title`}
          bodyKey={`${KEY}.concurrency.body`}
          reloadKey={`${KEY}.concurrency.reload`}
          onReload={handleReload}
        />
      ) : null}

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
              already showing it — i.e. the path looked ready but the server
              blocked it — so we never render the same checklist twice. */}
          {path.readiness?.isReady && (showBlocked.items?.length ?? 0) > 0 ? (
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
        <div role="group" aria-label={t(`${KEY}.actionsHeading`)} className="flex flex-wrap gap-2">
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

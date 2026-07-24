import { ApiError, getReadiness } from '@/lib/api/errors';
import {
  lifecycleActionsFor,
  type LearningPathReadiness,
  type LifecycleAction,
} from './detail-helpers';

/**
 * Pure decision + mapping helpers for the learning-path lifecycle panel (C3F).
 * Mirrors the course lifecycle helpers (C2G) but keyed to the learning-path
 * contract: readiness is unmet-only, and the 422 publish block carries the same
 * `readiness` extension shape. Kept free of React so the button-availability
 * rules and the 422 mapping can be unit-tested away from the dialog UI.
 */

export type { LearningPathReadiness, LifecycleAction };
export type LearningPathReadinessItem = NonNullable<LearningPathReadiness['items']>[number];

/** Why a rendered action is disabled, for an explanatory hint / aria-describedby. */
export type LifecycleDisabledReason = 'notReady';

export interface LifecycleActionSpec {
  action: LifecycleAction;
  disabled: boolean;
  reason?: LifecycleDisabledReason;
}

/**
 * The lifecycle actions to render for a path, given its publish state and
 * readiness. Reuses the ordering in {@link lifecycleActionsFor} and only marks
 * Publish disabled-with-reason when a Draft/InReview path is not yet ready — so
 * the user sees the path forward and the blocker rather than a missing button.
 *
 *   Draft / InReview → Publish (disabled until ready) + Archive
 *   Published        → Unpublish + Archive
 *   Archived         → Restore
 */
export function lifecycleActionSpecs(
  publishState: string | null | undefined,
  isReady: boolean,
): LifecycleActionSpec[] {
  return lifecycleActionsFor(publishState).map((action) =>
    action === 'publish' && !isReady
      ? { action, disabled: true, reason: 'notReady' }
      : { action, disabled: false },
  );
}

/** High-impact actions get a calmer destructive treatment + an impact note. */
export function isHighImpactAction(action: LifecycleAction): boolean {
  return action === 'archive' || action === 'unpublish';
}

/**
 * Narrow the `readiness` extension carried on a 422 publish-blocked response
 * (typed `unknown` on `ApiError`) into the readiness DTO the checklist renders,
 * or null when it is absent / the wrong shape.
 */
export function readinessFromError(error: unknown): LearningPathReadiness | null {
  const raw = getReadiness(error);
  if (raw && typeof raw === 'object' && ('items' in raw || 'isReady' in raw)) {
    return raw as LearningPathReadiness;
  }
  return null;
}

/**
 * Map a non-concurrency, non-readiness lifecycle failure to a safe i18n key.
 * 409 (concurrency) and 422 (readiness) are handled by the caller before this.
 */
export function lifecycleErrorKey(error: unknown): string {
  const base = 'staff.catalog.learningPaths.detail.publishing.error';
  if (error instanceof ApiError) {
    if (error.status === 400) return `${base}.invalidState`;
    if (error.status === 401 || error.status === 403) return `${base}.forbidden`;
    if (error.status === 404) return `${base}.notFound`;
  }
  return `${base}.generic`;
}

/** Dev-only overrides that force lifecycle visual states for screenshot QA. */
export interface LifecycleDemo {
  /** Render this confirmation dialog open. */
  dialog?: LifecycleAction;
  /** Show the confirm button in its loading state. */
  busy?: boolean;
  /** Show the success feedback for this action. */
  feedback?: LifecycleAction;
  /** Show the optimistic-concurrency conflict alert. */
  conflict?: boolean;
  /** Show the publish-blocked alert (uses the path's own readiness). */
  blocked?: boolean;
}

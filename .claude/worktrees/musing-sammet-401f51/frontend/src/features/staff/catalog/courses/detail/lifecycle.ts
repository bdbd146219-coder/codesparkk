import { ApiError, getReadiness } from '@/lib/api/errors';
import type { AdminCourseDetail } from '@/lib/api/admin/courses';

/**
 * Pure decision + mapping helpers for the course lifecycle panel (C2G). Kept
 * free of React so the button-availability rules and the 422-readiness mapping
 * can be unit-tested in isolation from the dialog UI.
 */

/** The publish-readiness checklist DTO, derived from the generated detail type. */
export type PublishReadiness = NonNullable<AdminCourseDetail['publishReadiness']>;
export type PublishReadinessItem = NonNullable<PublishReadiness['items']>[number];

export type LifecycleAction = 'publish' | 'unpublish' | 'archive' | 'restore';

/** Why a rendered action is disabled, for an explanatory hint / aria-describedby. */
export type LifecycleDisabledReason = 'notReady';

export interface LifecycleActionSpec {
  action: LifecycleAction;
  disabled: boolean;
  reason?: LifecycleDisabledReason;
}

/**
 * The lifecycle actions to render for a course, given its publish state and
 * readiness. Only actions valid for the current state are returned; an action
 * may still be present-but-disabled (publish on a not-yet-ready draft) so the
 * user sees the path and the blocker rather than a missing button.
 *
 *   Draft / InReview → Publish (disabled until ready) + Archive
 *   Published        → Unpublish + Archive
 *   Archived         → Restore
 */
export function lifecycleActionsFor(
  publishState: string | null | undefined,
  isReady: boolean,
): LifecycleActionSpec[] {
  switch (publishState) {
    case 'Draft':
    case 'InReview':
      return [
        isReady
          ? { action: 'publish', disabled: false }
          : { action: 'publish', disabled: true, reason: 'notReady' },
        { action: 'archive', disabled: false },
      ];
    case 'Published':
      return [
        { action: 'unpublish', disabled: false },
        { action: 'archive', disabled: false },
      ];
    case 'Archived':
      return [{ action: 'restore', disabled: false }];
    default:
      return [];
  }
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
export function readinessFromError(error: unknown): PublishReadiness | null {
  const raw = getReadiness(error);
  if (raw && typeof raw === 'object' && ('items' in raw || 'isReady' in raw)) {
    return raw as PublishReadiness;
  }
  return null;
}

/**
 * Map a non-concurrency, non-readiness lifecycle failure to a safe i18n key.
 * 409 (concurrency) and 422 (readiness) are handled by the caller before this.
 */
export function lifecycleErrorKey(error: unknown): string {
  const base = 'staff.catalog.courses.detail.publishing.error';
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
  /** Show the publish-blocked alert (uses the course's own readiness). */
  blocked?: boolean;
}

import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathDetail } from '@/lib/api/admin/learning-paths';

export type { AdminLearningPathDetail };

/** A single learning-path item (a course reference) from the detail payload. */
export type LearningPathItem = NonNullable<AdminLearningPathDetail['items']>[number];
/** The readiness envelope + one unmet requirement, sourced from the detail payload. */
export type LearningPathReadiness = NonNullable<AdminLearningPathDetail['readiness']>;
export type LearningPathReadinessItem = NonNullable<LearningPathReadiness['items']>[number];

/** Discriminated view state the detail screen renders from. 404→notfound, 403→forbidden. */
export type LearningPathDetailViewModel =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'notfound' }
  | { status: 'forbidden' }
  | { status: 'data'; path: AdminLearningPathDetail };

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: AdminLearningPathDetail | undefined;
}

/** Reduce a React Query result into the detail view model. */
export function toDetailViewModel(query: QueryLike): LearningPathDetailViewModel {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) {
    if (query.error instanceof ApiError) {
      if (query.error.status === 404) return { status: 'notfound' };
      if (query.error.status === 403) return { status: 'forbidden' };
    }
    return { status: 'error', messageKey: 'staff.catalog.learningPaths.detail.error.body' };
  }
  if (!query.data) return { status: 'notfound' };
  return { status: 'data', path: query.data };
}

/** Pick the value for the active language, falling back to the other, else undefined. */
export function bilingual(
  en: string | null | undefined,
  ar: string | null | undefined,
  lang: string,
): string | undefined {
  const e = en?.trim();
  const a = ar?.trim();
  const primary = lang.startsWith('ar') ? a || e : e || a;
  return primary || undefined;
}

/** Best display title for a learning path, with slug/em-dash fallback. */
export function detailTitle(path: AdminLearningPathDetail, lang: string): string {
  return bilingual(path.titleEn, path.titleAr, lang) || path.slug || '—';
}

/** Best display label for one item: course title (En) → course slug → course id. */
export function itemTitle(item: LearningPathItem): string {
  return item.courseTitleEn?.trim() || item.courseSlug?.trim() || item.courseId || '—';
}

/** Items ordered by their `order` field (stable copy). */
export function sortedItems(path: AdminLearningPathDetail): LearningPathItem[] {
  return [...(path.items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Short, locale-aware date. Returns an em dash for missing/invalid input. */
export function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar' : 'en', {
    dateStyle: 'medium',
  }).format(date);
}

export const DETAIL_TABS = ['overview', 'content', 'items', 'publishing'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

/** Validate a raw `?tab=` value, defaulting to overview. */
export function normalizeTab(raw: string | null | undefined): DetailTab {
  return (DETAIL_TABS as readonly string[]).includes(raw ?? '') ? (raw as DetailTab) : 'overview';
}

export type LifecycleAction = 'publish' | 'unpublish' | 'archive' | 'restore';

/**
 * The lifecycle actions relevant to a publish state, mirroring the backend
 * transitions. Rendered as *disabled* buttons in this read-only foundation —
 * the mutations land in a later task.
 */
export function lifecycleActionsFor(publishState: string | null | undefined): LifecycleAction[] {
  switch (publishState) {
    case 'Published':
      return ['unpublish', 'archive'];
    case 'Archived':
      return ['restore'];
    case 'Draft':
    case 'InReview':
      return ['publish', 'archive'];
    default:
      return [];
  }
}

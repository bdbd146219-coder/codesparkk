import { ApiError } from '@/lib/api/errors';
import type { AdminCourseDetail } from '@/lib/api/admin/courses';

export type { AdminCourseDetail };

/** Discriminated view state the course detail screen renders from. */
export type CourseDetailViewModel =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'notfound' }
  | { status: 'data'; course: AdminCourseDetail };

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: AdminCourseDetail | undefined;
}

/** Reduce a React Query result into the detail view model. 404 → notfound. */
export function toCourseDetailViewModel(query: QueryLike): CourseDetailViewModel {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) {
    if (query.error instanceof ApiError) {
      if (query.error.status === 404) return { status: 'notfound' };
      if (query.error.status === 403) {
        return { status: 'error', messageKey: 'staff.catalog.courses.detail.error.forbidden' };
      }
    }
    return { status: 'error', messageKey: 'staff.catalog.courses.detail.error.body' };
  }
  if (!query.data) return { status: 'notfound' };
  return { status: 'data', course: query.data };
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

/** Best display title for a course, with slug/em-dash fallback. */
export function detailTitle(course: AdminCourseDetail, lang: string): string {
  return bilingual(course.titleEn, course.titleAr, lang) || course.slug || '—';
}

export const DETAIL_TABS = ['overview', 'content', 'modules', 'instructors', 'publishing'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

/** Validate a raw `?tab=` value, defaulting to overview. */
export function normalizeTab(raw: string | null | undefined): DetailTab {
  return (DETAIL_TABS as readonly string[]).includes(raw ?? '') ? (raw as DetailTab) : 'overview';
}

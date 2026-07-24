import { ApiError } from '@/lib/api/errors';
import type { AdminCategoryListResult } from '@/lib/api/admin/categories';
import type { AdminCourseListResult } from '@/lib/api/admin/courses';

export type CourseListItem = NonNullable<AdminCourseListResult['items']>[number];

/** Category option for the filter dropdown (label resolved per locale at render). */
export interface CategoryOption {
  value: string;
  nameEn: string;
  nameAr: string;
}

/** Discriminated view state the presentational list renders from. */
export type CoursesViewModel =
  | { status: 'loading' }
  | { status: 'error'; messageKey: string }
  | { status: 'empty'; filtered: boolean }
  | {
      status: 'data';
      items: CourseListItem[];
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: AdminCourseListResult | undefined;
}

/** Map an i18n key for a failed list fetch — a 403 gets a distinct message. */
export function errorMessageKey(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) {
    return 'staff.catalog.courses.list.error.forbidden';
  }
  return 'staff.catalog.courses.list.error.body';
}

/** Reduce a React Query result + filter state into the list view model. */
export function toViewModel(query: QueryLike, filtered: boolean): CoursesViewModel {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) return { status: 'error', messageKey: errorMessageKey(query.error) };

  const items = query.data?.items ?? [];
  if (items.length === 0) return { status: 'empty', filtered };

  return {
    status: 'data',
    items,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? items.length,
    totalItems: query.data?.totalItems ?? items.length,
    totalPages: Math.max(query.data?.totalPages ?? 1, 1),
  };
}

/** Pick the best display title for the active language, falling back gracefully. */
export function courseTitle(course: CourseListItem, lang: string): string {
  const en = course.titleEn?.trim();
  const ar = course.titleAr?.trim();
  const primary = lang.startsWith('ar') ? ar || en : en || ar;
  return primary || course.slug || '—';
}

/** Localised category name for a course's category ref. */
export function categoryName(
  category: CourseListItem['category'],
  lang: string,
): string | undefined {
  if (!category) return undefined;
  const en = category.nameEn?.trim();
  const ar = category.nameAr?.trim();
  const primary = lang.startsWith('ar') ? ar || en : en || ar;
  return primary || category.slug || undefined;
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

/** Build category dropdown options from the admin categories result. */
export function toCategoryOptions(data: AdminCategoryListResult | undefined): CategoryOption[] {
  return (data?.items ?? [])
    .filter((c): c is typeof c & { slug: string } => Boolean(c.slug))
    .map((c) => ({
      value: c.slug,
      nameEn: c.nameEn?.trim() || c.slug,
      nameAr: c.nameAr?.trim() || c.nameEn?.trim() || c.slug,
    }));
}

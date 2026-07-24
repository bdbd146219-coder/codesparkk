import { ApiError } from '@/lib/api/errors';
import type { CatalogCourseDetail } from '@/lib/api/catalog';

/**
 * Pure helpers for the public course detail page (C4B). The detail view reduces
 * a React Query result into a small discriminated union (404 → a friendly
 * not-found, other failures → a retryable error), and prices are narrowed into
 * a display shape the view formats with i18n.
 */

export type CourseDetailViewModel =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; messageKey: string }
  | { status: 'data'; course: CatalogCourseDetail };

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: CatalogCourseDetail | undefined;
}

export function toCourseDetailViewModel(query: QueryLike): CourseDetailViewModel {
  if (query.isLoading) return { status: 'loading' };
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404)
      return { status: 'notfound' };
    return { status: 'error', messageKey: 'catalog.courses.detail.error.body' };
  }
  if (!query.data) return { status: 'notfound' };
  return { status: 'data', course: query.data };
}

/** Best display title, with a slug/em-dash fallback so a heading is never blank. */
export function courseDisplayTitle(course: CatalogCourseDetail): string {
  return course.title?.trim() || course.slug || '—';
}

export type CoursePricing = NonNullable<CatalogCourseDetail['pricing']>;

/**
 * The price display shape. Only `Free` is active in this phase; `OneTime` /
 * `Subscription` are modelled but carry no payment, so an amount may be absent —
 * in that case we surface the model rather than invent a number.
 */
export type PriceDisplay =
  | { kind: 'free' }
  | { kind: 'amount'; amount: number; currency: string }
  | { kind: 'model'; model: string };

export function coursePrice(pricing: CoursePricing | undefined | null): PriceDisplay {
  const model = pricing?.model;
  if (!model || model === 'Free') return { kind: 'free' };
  const amount = pricing?.amount;
  const currency = pricing?.currency;
  if (typeof amount === 'number' && currency) return { kind: 'amount', amount, currency };
  return { kind: 'model', model };
}

/** Format an amount + ISO currency, falling back to `amount currency` if Intl throws. */
export function formatPrice(amount: number, currency: string, lang: string): string {
  try {
    return new Intl.NumberFormat(lang.startsWith('ar') ? 'ar' : 'en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Ordered module previews (defensive copy sorted by `order`). */
export function courseModules(course: CatalogCourseDetail) {
  return [...(course.modulesPreview ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Non-empty outcome strings, in order. */
export function courseOutcomes(course: CatalogCourseDetail): string[] {
  return (course.outcomes ?? []).filter((o): o is string => Boolean(o?.trim()));
}

/** Known UI locale codes carried by `availableLocales` (unknown codes dropped). */
export function courseLocales(course: CatalogCourseDetail): ('en' | 'ar')[] {
  return (course.availableLocales ?? []).filter((l): l is 'en' | 'ar' => l === 'en' || l === 'ar');
}

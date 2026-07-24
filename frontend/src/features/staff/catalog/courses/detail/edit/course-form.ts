import { z } from 'zod';
import { getValidationErrors } from '@/lib/api/errors';
import type { UpdateCourseBody } from '@/lib/api/admin/courses';
import {
  AGE_BAND_VALUES,
  DELIVERY_VALUES,
  DIFFICULTY_VALUES,
} from '@/features/staff/catalog/courses/filters';
import type { AdminCourseDetail } from '../detail-helpers';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const V = 'staff.catalog.courses.edit.validation';

export interface OutcomeRow {
  textEn: string;
  textAr: string;
}

export interface CourseFormValues {
  slug: string;
  deliveryType: string;
  difficulty: string;
  ageBand: string;
  minAge: number;
  maxAge: number;
  primaryCategoryId: string;
  isListed: boolean;
  thumbnailKey: string;
  thumbnailAlt: string;
  heroKey: string;
  promoVideoUrl: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  summaryEn: string;
  summaryAr: string;
  descriptionEn: string;
  descriptionAr: string;
  outcomes: OutcomeRow[];
}

const s = (value: string | null | undefined): string => value ?? '';

/** Build form defaults from the loaded course detail. */
export function courseToForm(course: AdminCourseDetail): CourseFormValues {
  return {
    slug: s(course.slug),
    deliveryType: s(course.deliveryType),
    difficulty: s(course.difficulty),
    ageBand: s(course.ageBand),
    minAge: course.minAge ?? 0,
    maxAge: course.maxAge ?? 0,
    primaryCategoryId: course.primaryCategoryId ?? course.category?.id ?? '',
    isListed: course.isListed ?? false,
    thumbnailKey: s(course.media?.thumbnailKey),
    thumbnailAlt: s(course.media?.thumbnailAlt),
    heroKey: s(course.media?.heroKey),
    promoVideoUrl: s(course.media?.promoVideoUrl),
    titleEn: s(course.titleEn),
    titleAr: s(course.titleAr),
    subtitleEn: s(course.subtitleEn),
    subtitleAr: s(course.subtitleAr),
    summaryEn: s(course.summaryEn),
    summaryAr: s(course.summaryAr),
    descriptionEn: s(course.descriptionEn),
    descriptionAr: s(course.descriptionAr),
    outcomes: [...(course.outcomes ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((o) => ({ textEn: s(o.textEn), textAr: s(o.textAr) })),
  };
}

const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Build the PUT body from form values. `pricing` is intentionally omitted — the
 * backend preserves it when absent (pricing is not editable in this task).
 * `media` and `outcomes` are always sent so edits apply; titleEn is required.
 */
export function formToUpdateBody(
  values: CourseFormValues,
  rowVersion: string | null | undefined,
): UpdateCourseBody {
  return {
    rowVersion: rowVersion ?? '',
    slug: nullable(values.slug),
    titleEn: values.titleEn.trim(),
    titleAr: nullable(values.titleAr),
    subtitleEn: nullable(values.subtitleEn),
    subtitleAr: nullable(values.subtitleAr),
    summaryEn: nullable(values.summaryEn),
    summaryAr: nullable(values.summaryAr),
    descriptionEn: nullable(values.descriptionEn),
    descriptionAr: nullable(values.descriptionAr),
    deliveryType: values.deliveryType,
    difficulty: values.difficulty,
    ageBand: values.ageBand,
    minAge: values.minAge,
    maxAge: values.maxAge,
    primaryCategoryId: values.primaryCategoryId,
    isListed: values.isListed,
    media: {
      thumbnailKey: nullable(values.thumbnailKey),
      thumbnailAlt: nullable(values.thumbnailAlt),
      heroKey: nullable(values.heroKey),
      promoVideoUrl: nullable(values.promoVideoUrl),
    },
    outcomes: values.outcomes
      .filter((o) => o.textEn.trim() !== '' || o.textAr.trim() !== '')
      .map((o) => ({ textEn: nullable(o.textEn), textAr: nullable(o.textAr) })),
  };
}

const ageNumber = { invalid_type_error: V + '.ageNumber' };

const inSet = (values: readonly string[]) => (v: string) => values.includes(v);

const optionalUrl = z
  .string()
  .trim()
  .max(512, { message: V + '.tooLong' })
  .refine((v) => v === '' || /^https?:\/\//i.test(v), { message: V + '.urlInvalid' });

/**
 * Client schema — mirrors the backend enough to help, without enforcing full
 * publish readiness (those stay in the readiness checklist). Messages are i18n
 * keys resolved by the form.
 */
export const courseFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .max(80, { message: V + '.tooLong' })
      .refine((v) => v === '' || SLUG_RE.test(v), { message: V + '.slugInvalid' }),
    deliveryType: z.string().refine(inSet(DELIVERY_VALUES), { message: V + '.enum' }),
    difficulty: z.string().refine(inSet(DIFFICULTY_VALUES), { message: V + '.enum' }),
    ageBand: z.string().refine(inSet(AGE_BAND_VALUES), { message: V + '.enum' }),
    minAge: z.coerce
      .number(ageNumber)
      .int({ message: V + '.ageBounds' })
      .min(0, { message: V + '.ageBounds' })
      .max(120, { message: V + '.ageBounds' }),
    maxAge: z.coerce
      .number(ageNumber)
      .int({ message: V + '.ageBounds' })
      .min(0, { message: V + '.ageBounds' })
      .max(120, { message: V + '.ageBounds' }),
    primaryCategoryId: z.string().min(1, { message: V + '.categoryRequired' }),
    isListed: z.boolean(),
    thumbnailKey: z
      .string()
      .trim()
      .max(256, { message: V + '.tooLong' }),
    thumbnailAlt: z
      .string()
      .trim()
      .max(256, { message: V + '.tooLong' }),
    heroKey: z
      .string()
      .trim()
      .max(256, { message: V + '.tooLong' }),
    promoVideoUrl: optionalUrl,
    titleEn: z
      .string()
      .trim()
      .min(1, { message: V + '.titleRequired' })
      .max(160, { message: V + '.tooLong' }),
    titleAr: z
      .string()
      .trim()
      .max(160, { message: V + '.tooLong' }),
    subtitleEn: z
      .string()
      .trim()
      .max(200, { message: V + '.tooLong' }),
    subtitleAr: z
      .string()
      .trim()
      .max(200, { message: V + '.tooLong' }),
    summaryEn: z
      .string()
      .trim()
      .max(500, { message: V + '.tooLong' }),
    summaryAr: z
      .string()
      .trim()
      .max(500, { message: V + '.tooLong' }),
    descriptionEn: z.string().max(4000, { message: V + '.tooLong' }),
    descriptionAr: z.string().max(4000, { message: V + '.tooLong' }),
    outcomes: z
      .object({
        textEn: z
          .string()
          .trim()
          .max(300, { message: V + '.tooLong' }),
        textAr: z
          .string()
          .trim()
          .max(300, { message: V + '.tooLong' }),
      })
      .array(),
  })
  .refine((v) => v.minAge <= v.maxAge, { path: ['maxAge'], message: V + '.ageRange' });

/** Top-level form fields a server validation key can map onto. */
const SERVER_FIELD_MAP: Record<string, keyof CourseFormValues> = {
  slug: 'slug',
  titleen: 'titleEn',
  titlear: 'titleAr',
  subtitleen: 'subtitleEn',
  subtitlear: 'subtitleAr',
  summaryen: 'summaryEn',
  summaryar: 'summaryAr',
  descriptionen: 'descriptionEn',
  descriptionar: 'descriptionAr',
  deliverytype: 'deliveryType',
  difficulty: 'difficulty',
  ageband: 'ageBand',
  minage: 'minAge',
  maxage: 'maxAge',
  primarycategoryid: 'primaryCategoryId',
  islisted: 'isListed',
};

export interface MappedServerErrors {
  fields: { field: keyof CourseFormValues; message: string }[];
  /** Messages that could not be mapped to a specific field. */
  unmapped: string[];
}

/**
 * Split a 400 ValidationProblemDetails into per-field errors (for known
 * top-level fields) and an unmapped remainder (rendered in a summary). Returns
 * `null` when the error is not a field-validation problem.
 */
export function mapServerErrors(error: unknown): MappedServerErrors | null {
  const errors = getValidationErrors(error);
  if (!errors) return null;
  const fields: MappedServerErrors['fields'] = [];
  const unmapped: string[] = [];
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages[0] ?? '';
    const normalized =
      key
        .split('.')[0]
        ?.replace(/\[\d+\]$/, '')
        .toLowerCase() ?? '';
    const field = SERVER_FIELD_MAP[normalized];
    if (field) fields.push({ field, message });
    else unmapped.push(message);
  }
  return { fields, unmapped };
}

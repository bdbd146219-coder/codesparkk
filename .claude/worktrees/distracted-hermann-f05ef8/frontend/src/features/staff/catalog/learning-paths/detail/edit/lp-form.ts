import { z } from 'zod';
import { getValidationErrors } from '@/lib/api/errors';
import type {
  AdminLearningPathDetail,
  UpdateLearningPathBody,
} from '@/lib/api/admin/learning-paths';
import { AGE_BAND_VALUES } from '../../filters';

/**
 * Learning-path update form model, mirroring the C2F course editor. The client
 * schema mirrors the backend `UpdateLearningPathRequestValidator` enough to help
 * (title ≤160, summary ≤500, slug lowercase-hyphen ≤80, age band enum) without
 * enforcing publish-readiness (that stays server-side). Messages are i18n keys.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const V = 'staff.catalog.learningPaths.edit.validation';

export interface LearningPathFormValues {
  slug: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  ageBand: string;
  isListed: boolean;
  thumbnailKey: string;
  thumbnailAlt: string;
  heroKey: string;
  promoVideoUrl: string;
}

const s = (value: string | null | undefined): string => value ?? '';

/** Build form defaults from the loaded learning-path detail. */
export function detailToForm(path: AdminLearningPathDetail): LearningPathFormValues {
  return {
    slug: s(path.slug),
    titleEn: s(path.titleEn),
    titleAr: s(path.titleAr),
    summaryEn: s(path.summaryEn),
    summaryAr: s(path.summaryAr),
    ageBand: s(path.ageBand),
    isListed: path.isListed ?? false,
    thumbnailKey: s(path.media?.thumbnailKey),
    thumbnailAlt: s(path.media?.thumbnailAlt),
    heroKey: s(path.media?.heroKey),
    promoVideoUrl: s(path.media?.promoVideoUrl),
  };
}

const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Build the PUT body. `rowVersion`, `titleEn`, `ageBand`, and `isListed` are
 * always sent; other fields are nulled when blank. `media` is always sent so
 * cleared keys persist. The backend applies slug/listing state rules.
 */
export function formToUpdateBody(
  values: LearningPathFormValues,
  rowVersion: string | null | undefined,
): UpdateLearningPathBody {
  return {
    rowVersion: rowVersion ?? '',
    slug: nullable(values.slug),
    titleEn: values.titleEn.trim(),
    titleAr: nullable(values.titleAr),
    summaryEn: nullable(values.summaryEn),
    summaryAr: nullable(values.summaryAr),
    ageBand: values.ageBand,
    isListed: values.isListed,
    media: {
      thumbnailKey: nullable(values.thumbnailKey),
      thumbnailAlt: nullable(values.thumbnailAlt),
      heroKey: nullable(values.heroKey),
      promoVideoUrl: nullable(values.promoVideoUrl),
    },
  };
}

const inSet = (values: readonly string[]) => (v: string) => values.includes(v);

const optionalUrl = z
  .string()
  .trim()
  .max(512, { message: V + '.tooLong' })
  .refine((v) => v === '' || /^https?:\/\//i.test(v), { message: V + '.urlInvalid' });

export const learningPathFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .max(80, { message: V + '.tooLong' })
    .refine((v) => v === '' || SLUG_RE.test(v), { message: V + '.slugInvalid' }),
  titleEn: z
    .string()
    .trim()
    .min(1, { message: V + '.titleRequired' })
    .max(160, { message: V + '.tooLong' }),
  titleAr: z
    .string()
    .trim()
    .max(160, { message: V + '.tooLong' }),
  summaryEn: z
    .string()
    .trim()
    .max(500, { message: V + '.tooLong' }),
  summaryAr: z
    .string()
    .trim()
    .max(500, { message: V + '.tooLong' }),
  ageBand: z.string().refine(inSet(AGE_BAND_VALUES), { message: V + '.enum' }),
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
});

/** Top-level form fields a server validation key can map onto. */
const SERVER_FIELD_MAP: Record<string, keyof LearningPathFormValues> = {
  slug: 'slug',
  titleen: 'titleEn',
  titlear: 'titleAr',
  summaryen: 'summaryEn',
  summaryar: 'summaryAr',
  ageband: 'ageBand',
  islisted: 'isListed',
};

export interface MappedServerErrors {
  fields: { field: keyof LearningPathFormValues; message: string }[];
  /** Messages that could not be mapped to a specific field. */
  unmapped: string[];
}

/**
 * Split a 400 ValidationProblemDetails into per-field errors (for known fields)
 * and an unmapped remainder (rendered in a summary). Returns `null` when the
 * error is not a field-validation problem.
 */
export function mapServerErrors(error: unknown): MappedServerErrors | null {
  const errors = getValidationErrors(error);
  if (!errors) return null;
  const fields: MappedServerErrors['fields'] = [];
  const unmapped: string[] = [];
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages[0] ?? '';
    const normalized = key.split('.')[0]?.toLowerCase() ?? '';
    const field = SERVER_FIELD_MAP[normalized];
    if (field) fields.push({ field, message });
    else unmapped.push(message);
  }
  return { fields, unmapped };
}

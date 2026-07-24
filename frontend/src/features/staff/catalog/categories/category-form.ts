import { z } from 'zod';
import { getValidationErrors } from '@/lib/api/errors';
import type {
  AdminCategoryDetail,
  CreateCategoryBody,
  UpdateCategoryBody,
} from '@/lib/api/admin/categories';

/**
 * Category form model shared by the create and edit dialogs. The client schema
 * mirrors the backend validators (name ≤120, description ≤500, icon ≤80, slug
 * lowercase-hyphen ≤80, order ≥0) so obvious mistakes are caught before the
 * request; the backend stays the source of truth. Messages are i18n keys
 * resolved by the field components.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const V = 'staff.catalog.categories.form.validation';

export interface CategoryFormValues {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  slug: string;
  icon: string;
  order: number;
}

const s = (value: string | null | undefined): string => value ?? '';

/** Blank defaults for a new category. Order 0 → appended to the end by default. */
export function createCategoryDefaults(): CategoryFormValues {
  return {
    nameEn: '',
    nameAr: '',
    descriptionEn: '',
    descriptionAr: '',
    slug: '',
    icon: '',
    order: 0,
  };
}

/** Build edit-form defaults from a loaded category detail. */
export function detailToForm(detail: AdminCategoryDetail): CategoryFormValues {
  return {
    nameEn: s(detail.nameEn),
    nameAr: s(detail.nameAr),
    descriptionEn: s(detail.descriptionEn),
    descriptionAr: s(detail.descriptionAr),
    slug: s(detail.slug),
    icon: s(detail.icon),
    order: detail.order ?? 0,
  };
}

const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Build the POST body. `nameEn` is required; other fields are nulled when
 * blank. An empty slug is sent as `null` so the backend derives it from the
 * English name.
 */
export function formToCreateBody(values: CategoryFormValues): CreateCategoryBody {
  return {
    nameEn: values.nameEn.trim(),
    nameAr: nullable(values.nameAr),
    descriptionEn: nullable(values.descriptionEn),
    descriptionAr: nullable(values.descriptionAr),
    icon: nullable(values.icon),
    slug: nullable(values.slug),
    order: values.order,
  };
}

/** Build the PUT body. `rowVersion` + `order` are always sent (order is required). */
export function formToUpdateBody(
  values: CategoryFormValues,
  rowVersion: string | null | undefined,
): UpdateCategoryBody {
  return {
    rowVersion: rowVersion ?? '',
    nameEn: values.nameEn.trim(),
    nameAr: nullable(values.nameAr),
    descriptionEn: nullable(values.descriptionEn),
    descriptionAr: nullable(values.descriptionAr),
    icon: nullable(values.icon),
    slug: nullable(values.slug),
    order: values.order,
  };
}

const orderNumber = { invalid_type_error: V + '.orderNumber' };

export const categoryFormSchema = z.object({
  nameEn: z
    .string()
    .trim()
    .min(1, { message: V + '.nameRequired' })
    .max(120, { message: V + '.tooLong' }),
  nameAr: z
    .string()
    .trim()
    .max(120, { message: V + '.tooLong' }),
  descriptionEn: z
    .string()
    .trim()
    .max(500, { message: V + '.tooLong' }),
  descriptionAr: z
    .string()
    .trim()
    .max(500, { message: V + '.tooLong' }),
  slug: z
    .string()
    .trim()
    .max(80, { message: V + '.tooLong' })
    .refine((v) => v === '' || SLUG_RE.test(v), { message: V + '.slugInvalid' }),
  icon: z
    .string()
    .trim()
    .max(80, { message: V + '.tooLong' }),
  order: z.coerce
    .number(orderNumber)
    .int({ message: V + '.orderBounds' })
    .min(0, { message: V + '.orderBounds' })
    .max(9999, { message: V + '.orderBounds' }),
});

/** Top-level form fields a server validation key can map onto. */
const SERVER_FIELD_MAP: Record<string, keyof CategoryFormValues> = {
  nameen: 'nameEn',
  namear: 'nameAr',
  descriptionen: 'descriptionEn',
  descriptionar: 'descriptionAr',
  slug: 'slug',
  icon: 'icon',
  order: 'order',
};

export interface MappedServerErrors {
  fields: { field: keyof CategoryFormValues; message: string }[];
  /** Messages that could not be mapped to a specific field. */
  unmapped: string[];
}

/**
 * Split a 400 ValidationProblemDetails into per-field errors (for known
 * fields) and an unmapped remainder (rendered in a summary). Returns `null`
 * when the error is not a field-validation problem.
 */
export function mapCategoryServerErrors(error: unknown): MappedServerErrors | null {
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

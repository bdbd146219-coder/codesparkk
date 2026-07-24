import { z } from 'zod';
import type {
  CatalogInterestSourceType,
  CreateCatalogInterestBody,
} from '@/lib/api/catalog-interest';

const K = 'catalog.interest.form.errors';

/**
 * Public interest form. Only parent name + phone are required; email, child
 * age, and notes are optional so a legitimate parent is never blocked. All
 * fields are strings in the form and coerced on submit. Error messages are i18n
 * keys, resolved by the component.
 */
export const interestFormSchema = z.object({
  parentName: z.string().trim().min(2, `${K}.parentName`).max(120, `${K}.parentName`),
  phone: z
    .string()
    .trim()
    .min(6, `${K}.phone`)
    .max(30, `${K}.phone`)
    .regex(/^[0-9+()\-.\s]+$/, `${K}.phone`),
  email: z
    .string()
    .trim()
    .max(254, `${K}.email`)
    .refine((v) => v.length === 0 || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), `${K}.email`),
  childAge: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || (/^\d{1,2}$/.test(v) && Number(v) >= 3 && Number(v) <= 18),
      `${K}.childAge`,
    ),
  notes: z.string().trim().max(1000, `${K}.notes`),
});

export type InterestFormValues = z.infer<typeof interestFormSchema>;

export function interestDefaults(): InterestFormValues {
  return { parentName: '', phone: '', email: '', childAge: '', notes: '' };
}

/** Build the API body from validated form values + the source + current locale. */
export function formToInterestBody(
  values: InterestFormValues,
  sourceType: CatalogInterestSourceType,
  sourceSlug: string,
  language: string,
): CreateCatalogInterestBody {
  return {
    sourceType,
    sourceSlug,
    parentName: values.parentName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim() ? values.email.trim() : null,
    childAge: values.childAge.trim() ? Number(values.childAge) : null,
    preferredLanguage: language.toLowerCase().startsWith('ar') ? 'ar' : 'en',
    notes: values.notes.trim() ? values.notes.trim() : null,
  };
}

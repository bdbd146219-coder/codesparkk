import type { CreateCourseBody } from '@/lib/api/admin/courses';
import type { AdminCategoryListResult } from '@/lib/api/admin/categories';
import type { CourseFormValues } from '../detail/edit/course-form';
import { bilingual } from '../detail/detail-helpers';

/**
 * Create-page helpers. The create form reuses the C2F `CourseFormValues` shape
 * and `courseFormSchema` so the field components and validation are shared with
 * the editor; these helpers seed create-only defaults, build the create request
 * body (a subset of the full course), and shape the category options.
 */

/**
 * Blank-but-valid defaults for a new draft. Title + category are intentionally
 * empty (required → the admin must fill them); classification carries sensible
 * starting values so the first step stays short — all editable afterwards.
 */
export function createCourseDefaults(): CourseFormValues {
  return {
    slug: '',
    deliveryType: 'Recorded',
    difficulty: 'Beginner',
    ageBand: 'Junior',
    minAge: 6,
    maxAge: 9,
    primaryCategoryId: '',
    isListed: false,
    thumbnailKey: '',
    thumbnailAlt: '',
    heroKey: '',
    promoVideoUrl: '',
    titleEn: '',
    titleAr: '',
    subtitleEn: '',
    subtitleAr: '',
    summaryEn: '',
    summaryAr: '',
    descriptionEn: '',
    descriptionAr: '',
    outcomes: [],
  };
}

const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Build the POST body from the form — only the fields the create contract
 * accepts. Content, media, outcomes, modules, instructors, and publishing are
 * completed in the editor after the draft exists.
 */
export function formToCreateBody(values: CourseFormValues): CreateCourseBody {
  return {
    titleEn: values.titleEn.trim(),
    titleAr: nullable(values.titleAr),
    slug: nullable(values.slug),
    primaryCategoryId: values.primaryCategoryId,
    deliveryType: values.deliveryType,
    difficulty: values.difficulty,
    ageBand: values.ageBand,
    minAge: values.minAge,
    maxAge: values.maxAge,
  };
}

/** Category `<select>` options with a leading placeholder so none is preselected. */
export function buildCreateCategoryOptions(
  data: AdminCategoryListResult | undefined,
  chooseLabel: string,
  lang: string,
): { value: string; label: string }[] {
  const options = (data?.items ?? [])
    .filter((c): c is typeof c & { id: string } => Boolean(c.id))
    .map((c) => ({ value: c.id, label: bilingual(c.nameEn, c.nameAr, lang) || c.slug || c.id }));
  return [{ value: '', label: chooseLabel }, ...options];
}

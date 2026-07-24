import type { CreateLearningPathBody } from '@/lib/api/admin/learning-paths';
import type { LearningPathFormValues } from '../detail/edit/lp-form';

/**
 * Create-page helpers (C3G). The create form reuses the C3D `LearningPathFormValues`
 * shape and `learningPathFormSchema` so the field components and validation are
 * shared with the editor; these helpers seed create-only defaults and build the
 * create request body (a subset of the full path — no `isListed`, which is a
 * Published-only concern applied later in the editor).
 */

/**
 * Blank-but-valid defaults for a new draft. Title is intentionally empty
 * (required → the admin must fill it); age band carries a sensible starting
 * value so the first step stays short — all editable afterwards in the editor.
 */
export function createLearningPathDefaults(): LearningPathFormValues {
  return {
    slug: '',
    titleEn: '',
    titleAr: '',
    summaryEn: '',
    summaryAr: '',
    ageBand: 'Junior',
    isListed: false,
    thumbnailKey: '',
    thumbnailAlt: '',
    heroKey: '',
    promoVideoUrl: '',
  };
}

const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Build the POST body from the form — only the fields the create contract
 * accepts (titleEn required; titleAr/summaries/slug nulled when blank; ageBand).
 * `media` is optional in the contract and is left out entirely (kept out of the
 * guided first step — added in the editor), and `isListed` is not a create field
 * (a new path is always an unlisted Draft), so both are omitted here. Content,
 * media, items, and publishing are completed afterwards in the editor.
 */
export function formToCreateBody(values: LearningPathFormValues): CreateLearningPathBody {
  return {
    titleEn: values.titleEn.trim(),
    titleAr: nullable(values.titleAr),
    summaryEn: nullable(values.summaryEn),
    summaryAr: nullable(values.summaryAr),
    ageBand: values.ageBand,
    slug: nullable(values.slug),
  };
}

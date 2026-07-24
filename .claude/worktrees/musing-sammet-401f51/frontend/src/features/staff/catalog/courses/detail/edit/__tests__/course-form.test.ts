// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  courseFormSchema,
  courseToForm,
  formToUpdateBody,
  mapServerErrors,
  type CourseFormValues,
} from '../course-form';
import type { AdminCourseDetail } from '../../detail-helpers';

function detail(overrides: Partial<AdminCourseDetail> = {}): AdminCourseDetail {
  return {
    id: 'c1',
    slug: 'python-adventures',
    titleEn: 'Python Adventures',
    titleAr: null,
    subtitleEn: null,
    subtitleAr: null,
    summaryEn: 'Summary',
    summaryAr: null,
    descriptionEn: null,
    descriptionAr: null,
    deliveryType: 'Hybrid',
    difficulty: 'Intermediate',
    ageBand: 'Explorer',
    minAge: 10,
    maxAge: 14,
    publishState: 'Draft',
    isListed: false,
    primaryCategoryId: 'cat-1',
    category: { id: 'cat-1', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
    media: { thumbnailKey: 'k', thumbnailAlt: null, heroKey: null, promoVideoUrl: null },
    outcomes: [
      { textEn: 'B', textAr: null, order: 2 },
      { textEn: 'A', textAr: null, order: 1 },
    ],
    rowVersion: 'RV1',
    ...overrides,
  } as AdminCourseDetail;
}

function validValues(overrides: Partial<CourseFormValues> = {}): CourseFormValues {
  return {
    slug: 'python-adventures',
    deliveryType: 'Hybrid',
    difficulty: 'Intermediate',
    ageBand: 'Explorer',
    minAge: 10,
    maxAge: 14,
    primaryCategoryId: 'cat-1',
    isListed: false,
    thumbnailKey: '',
    thumbnailAlt: '',
    heroKey: '',
    promoVideoUrl: '',
    titleEn: 'Python Adventures',
    titleAr: '',
    subtitleEn: '',
    subtitleAr: '',
    summaryEn: '',
    summaryAr: '',
    descriptionEn: '',
    descriptionAr: '',
    outcomes: [{ textEn: 'A', textAr: '' }],
    ...overrides,
  };
}

describe('courseToForm', () => {
  it('maps nulls to empty strings and sorts outcomes by order', () => {
    const form = courseToForm(detail());
    expect(form.titleAr).toBe('');
    expect(form.primaryCategoryId).toBe('cat-1');
    expect(form.thumbnailKey).toBe('k');
    expect(form.outcomes.map((o) => o.textEn)).toEqual(['A', 'B']);
  });
});

describe('formToUpdateBody', () => {
  it('builds a safe payload: trims title, nulls empties, omits pricing, filters blank outcomes', () => {
    const body = formToUpdateBody(
      validValues({
        titleEn: '  Python  ',
        titleAr: '',
        outcomes: [
          { textEn: 'Keep', textAr: '' },
          { textEn: '', textAr: '' },
        ],
      }),
      'RV1',
    );
    expect(body.rowVersion).toBe('RV1');
    expect(body.titleEn).toBe('Python');
    expect(body.titleAr).toBeNull();
    expect('pricing' in body).toBe(false);
    expect(body.media).toBeDefined();
    expect(body.outcomes).toHaveLength(1);
    expect(body.outcomes?.[0]?.textEn).toBe('Keep');
  });
});

describe('courseFormSchema', () => {
  it('accepts valid values', () => {
    expect(courseFormSchema.safeParse(validValues()).success).toBe(true);
  });

  it('requires an English title', () => {
    const result = courseFormSchema.safeParse(validValues({ titleEn: '' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'titleEn');
      expect(issue?.message).toBe('staff.catalog.courses.edit.validation.titleRequired');
    }
  });

  it('rejects an invalid slug but allows empty', () => {
    expect(courseFormSchema.safeParse(validValues({ slug: 'Bad Slug' })).success).toBe(false);
    expect(courseFormSchema.safeParse(validValues({ slug: '' })).success).toBe(true);
  });

  it('rejects minAge greater than maxAge', () => {
    const result = courseFormSchema.safeParse(validValues({ minAge: 15, maxAge: 10 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'maxAge')).toBe(true);
    }
  });

  it('coerces numeric age strings', () => {
    const result = courseFormSchema.safeParse(validValues({ minAge: '8' as unknown as number }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.minAge).toBe(8);
  });
});

describe('mapServerErrors', () => {
  it('maps known fields and collects unmapped messages', () => {
    const error = new ApiError(400, 'https://x/errors/validation', 'k', undefined, {
      TitleEn: ['Title is required.'],
      'Pricing.Currency': ['Bad currency.'],
    });
    const mapped = mapServerErrors(error);
    expect(mapped).not.toBeNull();
    expect(mapped?.fields).toEqual([{ field: 'titleEn', message: 'Title is required.' }]);
    expect(mapped?.unmapped).toEqual(['Bad currency.']);
  });

  it('returns null for non-validation errors', () => {
    expect(mapServerErrors(new ApiError(409, 't', 'k'))).toBeNull();
    expect(mapServerErrors(new Error('x'))).toBeNull();
  });
});

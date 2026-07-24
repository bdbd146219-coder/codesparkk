import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { AdminLearningPathDetail } from '@/lib/api/admin/learning-paths';
import {
  detailToForm,
  formToUpdateBody,
  learningPathFormSchema,
  mapServerErrors,
  type LearningPathFormValues,
} from '../lp-form';

function detail(overrides: Partial<AdminLearningPathDetail> = {}): AdminLearningPathDetail {
  return {
    id: 'p1',
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    summaryEn: 'Summary EN',
    summaryAr: 'ملخّص',
    ageBand: 'Junior',
    publishState: 'Draft',
    isListed: false,
    media: {
      thumbnailKey: 'k.png',
      thumbnailAlt: 'alt',
      heroKey: null,
      promoVideoUrl: null,
    },
    items: [],
    readiness: { isReady: true, items: [] },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    publishedAt: null,
    archivedAt: null,
    deletedAt: null,
    rowVersion: 'RV1',
    ...overrides,
  } as AdminLearningPathDetail;
}

function baseValues(overrides: Partial<LearningPathFormValues> = {}): LearningPathFormValues {
  return {
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: '',
    summaryEn: '',
    summaryAr: '',
    ageBand: 'Junior',
    isListed: false,
    thumbnailKey: '',
    thumbnailAlt: '',
    heroKey: '',
    promoVideoUrl: '',
    ...overrides,
  };
}

describe('detailToForm', () => {
  it('maps the detail DTO onto the form, coalescing nulls to empty strings', () => {
    expect(detailToForm(detail())).toEqual({
      slug: 'junior-coder-journey',
      titleEn: 'Junior Coder Journey',
      titleAr: 'رحلة المبرمج الصغير',
      summaryEn: 'Summary EN',
      summaryAr: 'ملخّص',
      ageBand: 'Junior',
      isListed: false,
      thumbnailKey: 'k.png',
      thumbnailAlt: 'alt',
      heroKey: '',
      promoVideoUrl: '',
    });
  });
});

describe('formToUpdateBody', () => {
  it('always sends rowVersion/title/ageBand/isListed and a media object; nulls blank optionals', () => {
    const body = formToUpdateBody(
      baseValues({ titleEn: '  Path  ', titleAr: '  ', slug: '  my-path  ', isListed: true }),
      'RV9',
    );
    expect(body).toEqual({
      rowVersion: 'RV9',
      slug: 'my-path',
      titleEn: 'Path',
      titleAr: null,
      summaryEn: null,
      summaryAr: null,
      ageBand: 'Junior',
      isListed: true,
      media: { thumbnailKey: null, thumbnailAlt: null, heroKey: null, promoVideoUrl: null },
    });
  });

  it('falls back to an empty rowVersion when missing', () => {
    expect(formToUpdateBody(baseValues(), null).rowVersion).toBe('');
  });
});

describe('learningPathFormSchema', () => {
  it('accepts a valid form', () => {
    expect(learningPathFormSchema.safeParse(baseValues()).success).toBe(true);
  });

  it('requires an English title', () => {
    const result = learningPathFormSchema.safeParse(baseValues({ titleEn: '' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'staff.catalog.learningPaths.edit.validation.titleRequired',
      );
    }
  });

  it('rejects an invalid slug but accepts a blank one', () => {
    expect(learningPathFormSchema.safeParse(baseValues({ slug: 'Not Valid' })).success).toBe(false);
    expect(learningPathFormSchema.safeParse(baseValues({ slug: '' })).success).toBe(true);
  });

  it('rejects an unknown age band and a non-http promo url', () => {
    expect(learningPathFormSchema.safeParse(baseValues({ ageBand: 'Grown' })).success).toBe(false);
    expect(learningPathFormSchema.safeParse(baseValues({ promoVideoUrl: 'ftp://x' })).success).toBe(
      false,
    );
    expect(
      learningPathFormSchema.safeParse(baseValues({ promoVideoUrl: 'https://x.dev/v' })).success,
    ).toBe(true);
  });
});

describe('mapServerErrors', () => {
  it('maps known fields and collects the rest', () => {
    const err = new ApiError(400, 'about:blank/validation', 'k', undefined, {
      TitleEn: ['Required'],
      Slug: ['Bad slug'],
      Something: ['Odd'],
    });
    const mapped = mapServerErrors(err);
    expect(mapped?.fields).toEqual([
      { field: 'titleEn', message: 'Required' },
      { field: 'slug', message: 'Bad slug' },
    ]);
    expect(mapped?.unmapped).toEqual(['Odd']);
  });

  it('returns null when not a validation problem', () => {
    expect(mapServerErrors(new ApiError(409, 'x', 'k'))).toBeNull();
  });
});

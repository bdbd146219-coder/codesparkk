import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { AdminCategoryDetail } from '@/lib/api/admin/categories';
import {
  categoryFormSchema,
  createCategoryDefaults,
  detailToForm,
  formToCreateBody,
  formToUpdateBody,
  mapCategoryServerErrors,
  type CategoryFormValues,
} from '../category-form';

function baseValues(overrides: Partial<CategoryFormValues> = {}): CategoryFormValues {
  return { ...createCategoryDefaults(), nameEn: 'Foundations', ...overrides };
}

describe('createCategoryDefaults', () => {
  it('is blank with order 0', () => {
    expect(createCategoryDefaults()).toEqual({
      nameEn: '',
      nameAr: '',
      descriptionEn: '',
      descriptionAr: '',
      slug: '',
      icon: '',
      order: 0,
    });
  });
});

describe('detailToForm', () => {
  it('maps a detail DTO onto the form, coalescing nulls to empty strings', () => {
    const detail = {
      id: 'c1',
      slug: 'foundations',
      nameEn: 'Foundations',
      nameAr: 'الأساسيات',
      descriptionEn: 'Core concepts',
      descriptionAr: null,
      icon: null,
      order: 3,
      isActive: true,
      publishedCourseCount: 4,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      rowVersion: 'RV1',
    } as unknown as AdminCategoryDetail;
    expect(detailToForm(detail)).toEqual({
      nameEn: 'Foundations',
      nameAr: 'الأساسيات',
      descriptionEn: 'Core concepts',
      descriptionAr: '',
      slug: 'foundations',
      icon: '',
      order: 3,
    });
  });
});

describe('formToCreateBody', () => {
  it('trims the name, nulls blank optionals, and derives slug when blank', () => {
    const body = formToCreateBody(
      baseValues({ nameEn: '  Foundations  ', nameAr: '  ', slug: '  ', order: 2 }),
    );
    expect(body).toEqual({
      nameEn: 'Foundations',
      nameAr: null,
      descriptionEn: null,
      descriptionAr: null,
      icon: null,
      slug: null,
      order: 2,
    });
  });

  it('keeps a provided slug and icon', () => {
    const body = formToCreateBody(baseValues({ slug: 'my-slug', icon: 'sparkles' }));
    expect(body.slug).toBe('my-slug');
    expect(body.icon).toBe('sparkles');
  });
});

describe('formToUpdateBody', () => {
  it('always sends rowVersion and order', () => {
    const body = formToUpdateBody(baseValues({ order: 5 }), 'RV9');
    expect(body.rowVersion).toBe('RV9');
    expect(body.order).toBe(5);
    expect(body.nameEn).toBe('Foundations');
  });

  it('falls back to an empty rowVersion when missing', () => {
    expect(formToUpdateBody(baseValues(), null).rowVersion).toBe('');
  });
});

describe('categoryFormSchema', () => {
  it('accepts a valid category', () => {
    expect(categoryFormSchema.safeParse(baseValues({ slug: 'web-dev', order: 1 })).success).toBe(
      true,
    );
  });

  it('requires an English name', () => {
    const result = categoryFormSchema.safeParse(baseValues({ nameEn: '' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'staff.catalog.categories.form.validation.nameRequired',
      );
    }
  });

  it('rejects an invalid slug', () => {
    expect(categoryFormSchema.safeParse(baseValues({ slug: 'Not Valid' })).success).toBe(false);
  });

  it('accepts a blank slug (derived server-side)', () => {
    expect(categoryFormSchema.safeParse(baseValues({ slug: '' })).success).toBe(true);
  });

  it('rejects a negative order', () => {
    expect(categoryFormSchema.safeParse(baseValues({ order: -1 })).success).toBe(false);
  });
});

describe('mapCategoryServerErrors', () => {
  it('maps known fields and collects the rest', () => {
    const err = new ApiError(400, 'about:blank/validation', 'k', undefined, {
      NameEn: ['Required'],
      Slug: ['Bad slug'],
      Something: ['Odd'],
    });
    const mapped = mapCategoryServerErrors(err);
    expect(mapped?.fields).toEqual([
      { field: 'nameEn', message: 'Required' },
      { field: 'slug', message: 'Bad slug' },
    ]);
    expect(mapped?.unmapped).toEqual(['Odd']);
  });

  it('returns null when the error is not a validation problem', () => {
    expect(mapCategoryServerErrors(new ApiError(409, 'x', 'k'))).toBeNull();
    expect(mapCategoryServerErrors(new Error('boom'))).toBeNull();
  });
});

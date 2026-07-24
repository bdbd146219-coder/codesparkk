import { describe, expect, it } from 'vitest';
import type { AdminCategoryListResult } from '@/lib/api/admin/categories';
import {
  buildCreateCategoryOptions,
  createCourseDefaults,
  formToCreateBody,
} from '../course-create';

describe('createCourseDefaults', () => {
  it('leaves title + category empty and seeds valid classification', () => {
    const d = createCourseDefaults();
    expect(d.titleEn).toBe('');
    expect(d.primaryCategoryId).toBe('');
    expect(d.deliveryType).toBe('Recorded');
    expect(d.difficulty).toBe('Beginner');
    expect(d.ageBand).toBe('Junior');
    expect(d.minAge).toBe(6);
    expect(d.maxAge).toBe(9);
    expect(d.outcomes).toEqual([]);
  });
});

describe('formToCreateBody', () => {
  it('sends only the create fields, trimmed, with empty optionals nulled', () => {
    const body = formToCreateBody({
      ...createCourseDefaults(),
      titleEn: '  My Course  ',
      titleAr: '  ',
      slug: '  my-course  ',
      primaryCategoryId: 'cat-1',
      deliveryType: 'Hybrid',
      difficulty: 'Intermediate',
      ageBand: 'Explorer',
      minAge: 10,
      maxAge: 14,
    });
    expect(body).toEqual({
      titleEn: 'My Course',
      titleAr: null,
      slug: 'my-course',
      primaryCategoryId: 'cat-1',
      deliveryType: 'Hybrid',
      difficulty: 'Intermediate',
      ageBand: 'Explorer',
      minAge: 10,
      maxAge: 14,
    });
    // No editor-only fields leak into the create body.
    expect(Object.keys(body)).not.toContain('summaryEn');
    expect(Object.keys(body)).not.toContain('outcomes');
  });
});

describe('buildCreateCategoryOptions', () => {
  it('prepends a placeholder and maps bilingual labels', () => {
    const data = {
      items: [{ id: 'c1', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' }],
    } as unknown as AdminCategoryListResult;
    expect(buildCreateCategoryOptions(data, 'Select…', 'en')).toEqual([
      { value: '', label: 'Select…' },
      { value: 'c1', label: 'Foundations' },
    ]);
    expect(buildCreateCategoryOptions(data, 'اختر…', 'ar')[1]).toEqual({
      value: 'c1',
      label: 'الأساسيات',
    });
  });

  it('returns just the placeholder when there is no data', () => {
    expect(buildCreateCategoryOptions(undefined, 'Select…', 'en')).toEqual([
      { value: '', label: 'Select…' },
    ]);
  });
});

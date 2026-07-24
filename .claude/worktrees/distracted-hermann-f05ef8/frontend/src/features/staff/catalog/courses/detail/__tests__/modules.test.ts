import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  formToAddBody,
  formToUpdateBody,
  mapModuleServerErrors,
  moduleErrorKey,
  moduleFormSchema,
  moduleToForm,
  moveModuleIds,
  type CourseModule,
  type ModuleFormValues,
} from '../modules';

const ERR = 'staff.catalog.courses.detail.modules.error';
const V = 'staff.catalog.courses.detail.modules.validation';

const values: ModuleFormValues = {
  titleEn: '  Getting started  ',
  titleAr: '',
  summaryEn: '  Setup and first script  ',
  summaryAr: '',
};

describe('moduleFormSchema', () => {
  it('accepts a valid module and requires an English title', () => {
    expect(moduleFormSchema.safeParse({ ...values, titleEn: 'Intro' }).success).toBe(true);
    const empty = moduleFormSchema.safeParse({ ...values, titleEn: '   ' });
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.issues[0]?.message).toBe(`${V}.titleRequired`);
    }
  });

  it('bounds title length', () => {
    const long = moduleFormSchema.safeParse({ ...values, titleEn: 'x'.repeat(161) });
    expect(long.success).toBe(false);
    if (!long.success) expect(long.error.issues[0]?.message).toBe(`${V}.tooLong`);
  });
});

describe('moduleToForm', () => {
  it('blanks a new module and hydrates an existing one', () => {
    expect(moduleToForm(null)).toEqual({ titleEn: '', titleAr: '', summaryEn: '', summaryAr: '' });
    const m: CourseModule = { id: 'm1', titleEn: 'Intro', titleAr: 'مقدمة', summaryEn: 'S' };
    expect(moduleToForm(m)).toEqual({
      titleEn: 'Intro',
      titleAr: 'مقدمة',
      summaryEn: 'S',
      summaryAr: '',
    });
  });
});

describe('formToAddBody / formToUpdateBody', () => {
  it('trims the title, nullifies empty optionals, and carries the rowVersion', () => {
    const body = formToAddBody(values, 'RV1');
    expect(body).toEqual({
      rowVersion: 'RV1',
      titleEn: 'Getting started',
      titleAr: null,
      summaryEn: 'Setup and first script',
      summaryAr: null,
    });
    expect(formToUpdateBody(values, 'RV2').rowVersion).toBe('RV2');
    expect(formToAddBody(values, null).rowVersion).toBe('');
  });
});

describe('moveModuleIds', () => {
  const mods: CourseModule[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('swaps neighbours for a valid move', () => {
    expect(moveModuleIds(mods, 0, 'down')).toEqual(['b', 'a', 'c']);
    expect(moveModuleIds(mods, 2, 'up')).toEqual(['a', 'c', 'b']);
  });

  it('returns null at the boundaries', () => {
    expect(moveModuleIds(mods, 0, 'up')).toBeNull();
    expect(moveModuleIds(mods, 2, 'down')).toBeNull();
  });

  it('returns null when a module is missing an id', () => {
    expect(moveModuleIds([{ id: 'a' }, { order: 2 }], 0, 'down')).toBeNull();
  });
});

describe('mapModuleServerErrors', () => {
  it('maps known fields and collects the rest', () => {
    const err = new ApiError(400, 'x', 'k', undefined, {
      TitleEn: ['Required'],
      Something: ['Nope'],
    });
    const mapped = mapModuleServerErrors(err);
    expect(mapped?.fields).toEqual([{ field: 'titleEn', message: 'Required' }]);
    expect(mapped?.unmapped).toEqual(['Nope']);
  });

  it('returns null when there is no validation map', () => {
    expect(mapModuleServerErrors(new ApiError(409, 'x', 'k'))).toBeNull();
  });
});

describe('moduleErrorKey', () => {
  it('maps statuses to safe keys', () => {
    expect(moduleErrorKey(new ApiError(400, 'x', 'k'))).toBe(`${ERR}.invalidState`);
    expect(moduleErrorKey(new ApiError(403, 'x', 'k'))).toBe(`${ERR}.forbidden`);
    expect(moduleErrorKey(new ApiError(404, 'x', 'k'))).toBe(`${ERR}.notFound`);
    expect(moduleErrorKey(new ApiError(500, 'x', 'k'))).toBe(`${ERR}.generic`);
    expect(moduleErrorKey(new Error('net'))).toBe(`${ERR}.generic`);
  });
});

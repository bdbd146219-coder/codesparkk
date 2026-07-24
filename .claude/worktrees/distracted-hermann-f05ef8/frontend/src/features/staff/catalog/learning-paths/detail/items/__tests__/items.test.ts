import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { LearningPathItem } from '../../detail-helpers';
import {
  addItemDefaults,
  addItemFormSchema,
  formToAddItemBody,
  itemErrorKey,
  mapAddItemServerErrors,
  moveItemIds,
  type AddItemFormValues,
} from '../items';

const UUID = '00000000-0000-0000-0000-000000000001';

function items(ids: string[]): LearningPathItem[] {
  return ids.map((id, i) => ({ id, courseId: `c${i}`, order: i + 1 }) as LearningPathItem);
}

function values(overrides: Partial<AddItemFormValues> = {}): AddItemFormValues {
  return { courseId: UUID, note: '', ...overrides };
}

describe('formToAddItemBody', () => {
  it('sends rowVersion + trimmed courseId and nulls a blank note', () => {
    const body = formToAddItemBody(values({ courseId: `  ${UUID}  `, note: '  ' }), 'RV1');
    expect(body).toEqual({ rowVersion: 'RV1', courseId: UUID, note: null });
  });

  it('keeps a note and defaults rowVersion to empty', () => {
    const body = formToAddItemBody(values({ note: '  Start here  ' }), null);
    expect(body.note).toBe('Start here');
    expect(body.rowVersion).toBe('');
  });
});

describe('addItemFormSchema', () => {
  it('accepts a valid UUID courseId', () => {
    expect(addItemFormSchema.safeParse(values()).success).toBe(true);
  });

  it('requires a courseId and rejects a non-UUID', () => {
    expect(addItemFormSchema.safeParse(values({ courseId: '' })).success).toBe(false);
    const bad = addItemFormSchema.safeParse(values({ courseId: 'not-a-uuid' }));
    expect(bad.success).toBe(false);
    if (!bad.success) {
      expect(bad.error.issues[0]?.message).toBe(
        'staff.catalog.learningPaths.detail.items.validation.courseIdFormat',
      );
    }
  });

  it('bounds the note length', () => {
    expect(addItemFormSchema.safeParse(values({ note: 'x'.repeat(301) })).success).toBe(false);
  });
});

describe('moveItemIds', () => {
  it('moves an item down and up', () => {
    expect(moveItemIds(items(['a', 'b', 'c']), 0, 'down')).toEqual(['b', 'a', 'c']);
    expect(moveItemIds(items(['a', 'b', 'c']), 2, 'up')).toEqual(['a', 'c', 'b']);
  });

  it('returns null at the boundaries', () => {
    expect(moveItemIds(items(['a', 'b']), 0, 'up')).toBeNull();
    expect(moveItemIds(items(['a', 'b']), 1, 'down')).toBeNull();
  });

  it('returns null when any item is missing an id', () => {
    const withMissing = [{ id: 'a' }, { id: undefined }] as unknown as LearningPathItem[];
    expect(moveItemIds(withMissing, 0, 'down')).toBeNull();
  });
});

describe('addItemDefaults', () => {
  it('is blank', () => {
    expect(addItemDefaults()).toEqual({ courseId: '', note: '' });
  });
});

describe('mapAddItemServerErrors', () => {
  it('maps courseId/note and collects the rest', () => {
    const err = new ApiError(400, 'about:blank/validation', 'k', undefined, {
      CourseId: ['Required'],
      Something: ['Odd'],
    });
    const mapped = mapAddItemServerErrors(err);
    expect(mapped?.fields).toEqual([{ field: 'courseId', message: 'Required' }]);
    expect(mapped?.unmapped).toEqual(['Odd']);
  });

  it('returns null for a non-validation error', () => {
    expect(mapAddItemServerErrors(new ApiError(409, 'x', 'k'))).toBeNull();
  });
});

describe('itemErrorKey', () => {
  it('maps status codes to safe keys', () => {
    const K = 'staff.catalog.learningPaths.detail.items.error';
    expect(itemErrorKey(new ApiError(400, 'x', 'k'))).toBe(`${K}.invalidState`);
    expect(itemErrorKey(new ApiError(403, 'x', 'k'))).toBe(`${K}.forbidden`);
    expect(itemErrorKey(new ApiError(404, 'x', 'k'))).toBe(`${K}.notFound`);
    expect(itemErrorKey(new Error('boom'))).toBe(`${K}.generic`);
  });
});

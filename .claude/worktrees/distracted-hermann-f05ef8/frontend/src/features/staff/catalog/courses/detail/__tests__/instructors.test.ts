import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import type { AdminCourseDetail } from '@/lib/api/admin/courses';
import {
  formToAssignBody,
  hasLeadInstructor,
  instructorErrorKey,
  instructorFormSchema,
  instructorRoleBadgeVariant,
  instructorRoleKey,
  isInstructorNotFound,
  mapInstructorServerErrors,
  type InstructorFormValues,
} from '../instructors';

const ERR = 'staff.catalog.courses.detail.instructors.error';
const V = 'staff.catalog.courses.detail.instructors.validation';
const UUID = '11111111-1111-1111-1111-111111111111';

const values: InstructorFormValues = { instructorUserId: `  ${UUID}  `, roleOnCourse: 'Lead' };

describe('instructorFormSchema', () => {
  it('accepts a valid uuid + role', () => {
    expect(
      instructorFormSchema.safeParse({ instructorUserId: UUID, roleOnCourse: 'Lead' }).success,
    ).toBe(true);
    expect(
      instructorFormSchema.safeParse({ instructorUserId: UUID, roleOnCourse: 'Assistant' }).success,
    ).toBe(true);
  });

  it('rejects an empty id, a non-uuid id, and an unknown role', () => {
    const empty = instructorFormSchema.safeParse({ instructorUserId: '  ', roleOnCourse: 'Lead' });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0]?.message).toBe(`${V}.idRequired`);

    const bad = instructorFormSchema.safeParse({ instructorUserId: 'nope', roleOnCourse: 'Lead' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]?.message).toBe(`${V}.idFormat`);

    const role = instructorFormSchema.safeParse({ instructorUserId: UUID, roleOnCourse: 'Boss' });
    expect(role.success).toBe(false);
    if (!role.success) expect(role.error.issues[0]?.message).toBe(`${V}.roleRequired`);
  });
});

describe('formToAssignBody', () => {
  it('trims the id and carries the rowVersion + role', () => {
    expect(formToAssignBody(values, 'RV1')).toEqual({
      rowVersion: 'RV1',
      instructorUserId: UUID,
      roleOnCourse: 'Lead',
    });
    expect(formToAssignBody(values, null).rowVersion).toBe('');
  });
});

describe('mapInstructorServerErrors', () => {
  it('maps known fields and collects the rest', () => {
    const err = new ApiError(400, 'x', 'k', undefined, {
      InstructorUserId: ['Required'],
      Other: ['Nope'],
    });
    const mapped = mapInstructorServerErrors(err);
    expect(mapped?.fields).toEqual([{ field: 'instructorUserId', message: 'Required' }]);
    expect(mapped?.unmapped).toEqual(['Nope']);
  });

  it('returns null without a validation map', () => {
    expect(mapInstructorServerErrors(new ApiError(409, 'x', 'k'))).toBeNull();
  });
});

describe('isInstructorNotFound', () => {
  it('is true only for a 404 ApiError', () => {
    expect(isInstructorNotFound(new ApiError(404, 'x', 'k'))).toBe(true);
    expect(isInstructorNotFound(new ApiError(400, 'x', 'k'))).toBe(false);
    expect(isInstructorNotFound(new Error('nope'))).toBe(false);
  });
});

describe('instructorErrorKey', () => {
  it('maps statuses to safe keys', () => {
    expect(instructorErrorKey(new ApiError(400, 'x', 'k'))).toBe(`${ERR}.invalidState`);
    expect(instructorErrorKey(new ApiError(403, 'x', 'k'))).toBe(`${ERR}.forbidden`);
    expect(instructorErrorKey(new ApiError(404, 'x', 'k'))).toBe(`${ERR}.notFound`);
    expect(instructorErrorKey(new ApiError(500, 'x', 'k'))).toBe(`${ERR}.generic`);
    expect(instructorErrorKey(new Error('net'))).toBe(`${ERR}.generic`);
  });
});

describe('role helpers', () => {
  it('maps role badge variants and keys', () => {
    expect(instructorRoleBadgeVariant('Lead')).toBe('default');
    expect(instructorRoleBadgeVariant('Assistant')).toBe('secondary');
    expect(instructorRoleKey('Lead')).toBe('staff.catalog.enums.instructorRole.Lead');
    expect(instructorRoleKey(null)).toBe('');
  });

  it('detects a Lead instructor', () => {
    const base = { instructors: [] } as unknown as AdminCourseDetail;
    expect(hasLeadInstructor(base)).toBe(false);
    expect(
      hasLeadInstructor({
        instructors: [{ instructorUserId: 'a', role: 'Assistant' }],
      } as unknown as AdminCourseDetail),
    ).toBe(false);
    expect(
      hasLeadInstructor({
        instructors: [{ instructorUserId: 'a', role: 'Lead' }],
      } as unknown as AdminCourseDetail),
    ).toBe(true);
  });
});

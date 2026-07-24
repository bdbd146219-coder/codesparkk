import { describe, expect, it } from 'vitest';
import {
  STAFF_ROLES,
  hasAnyRole,
  isStaff,
  normalizeRole,
  normalizeRoles,
  primaryRole,
} from '../roles';

describe('normalizeRole', () => {
  it('maps backend PascalCase roles to AppRole tokens', () => {
    expect(normalizeRole('Admin')).toBe('admin');
    expect(normalizeRole('SuperAdmin')).toBe('super_admin');
    expect(normalizeRole('Instructor')).toBe('instructor');
    expect(normalizeRole('Parent')).toBe('parent');
    expect(normalizeRole('Student')).toBe('student');
  });

  it('tolerates casing and separator drift', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('super_admin')).toBe('super_admin');
    expect(normalizeRole('SUPER-ADMIN')).toBe('super_admin');
    expect(normalizeRole('  Super Admin  ')).toBe('super_admin');
  });

  it('returns null for unknown, empty, or non-string input', () => {
    expect(normalizeRole('wizard')).toBeNull();
    expect(normalizeRole('')).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });
});

describe('normalizeRoles', () => {
  it('drops unknown entries and de-duplicates', () => {
    expect(normalizeRoles(['Admin', 'wizard', 'admin', null, undefined])).toEqual(['admin']);
  });

  it('is safe with null / undefined', () => {
    expect(normalizeRoles(null)).toEqual([]);
    expect(normalizeRoles(undefined)).toEqual([]);
  });
});

describe('isStaff', () => {
  it('recognises Admin and SuperAdmin as staff', () => {
    expect(isStaff(['Admin'])).toBe(true);
    expect(isStaff(['SuperAdmin'])).toBe(true);
    expect(isStaff(['Parent', 'SuperAdmin'])).toBe(true);
  });

  it('rejects Parent, Instructor, Student, unknown, and empty', () => {
    expect(isStaff(['Parent'])).toBe(false);
    expect(isStaff(['Instructor'])).toBe(false);
    expect(isStaff(['Student'])).toBe(false);
    expect(isStaff(['wizard'])).toBe(false);
    expect(isStaff([])).toBe(false);
    expect(isStaff(null)).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('matches when any normalized role is in the allowed set', () => {
    expect(hasAnyRole(['Instructor'], ['instructor'])).toBe(true);
    expect(hasAnyRole(['Admin', 'Parent'], STAFF_ROLES)).toBe(true);
  });

  it('returns false when no role matches or the allowed set is empty', () => {
    expect(hasAnyRole(['Instructor'], STAFF_ROLES)).toBe(false);
    expect(hasAnyRole(['Admin'], [])).toBe(false);
    expect(hasAnyRole(null, STAFF_ROLES)).toBe(false);
  });
});

describe('primaryRole', () => {
  it('picks the highest-privilege role', () => {
    expect(primaryRole(['Parent', 'Admin'])).toBe('admin');
    expect(primaryRole(['Admin', 'SuperAdmin'])).toBe('super_admin');
    expect(primaryRole(['Instructor'])).toBe('instructor');
  });

  it('returns undefined when no role is recognised', () => {
    expect(primaryRole(['wizard'])).toBeUndefined();
    expect(primaryRole([])).toBeUndefined();
    expect(primaryRole(null)).toBeUndefined();
  });
});

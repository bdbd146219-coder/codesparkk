import type { AppRole } from '@/lib/navigation';

/**
 * Single source of truth for turning role strings into the app's canonical
 * {@link AppRole} tokens. The backend emits PascalCase Identity role names
 * (`Admin`, `SuperAdmin`, `Parent`, …) while the frontend nav config uses
 * lowercase/snake tokens (`admin`, `super_admin`, …). Normalising in one place
 * keeps role comparisons out of components and tolerant of formatting drift
 * (casing, spaces, hyphens, underscores).
 */

/** Roles allowed into the staff productivity shell. Instructor is blocked in V1. */
export const STAFF_ROLES: readonly AppRole[] = ['admin', 'super_admin'] as const;

// Compact (alphanumeric-only, lowercased) form → canonical AppRole.
const CANONICAL_BY_COMPACT: Record<string, AppRole> = {
  parent: 'parent',
  student: 'student',
  instructor: 'instructor',
  admin: 'admin',
  superadmin: 'super_admin',
};

/** Reduce a raw role string to its alphanumeric, lowercase core. */
function compact(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalise a single role string to an {@link AppRole}, or `null` if it is not
 * a role we recognise. Accepts any casing/separator style — `"SuperAdmin"`,
 * `"super_admin"`, `"super-admin"`, and `" Super Admin "` all map to
 * `"super_admin"`.
 */
export function normalizeRole(raw: string | null | undefined): AppRole | null {
  if (typeof raw !== 'string') return null;
  return CANONICAL_BY_COMPACT[compact(raw)] ?? null;
}

/**
 * Normalise a list of role strings, dropping unrecognised entries and
 * de-duplicating. Safe to call with `null`/`undefined`.
 */
export function normalizeRoles(
  raw: ReadonlyArray<string | null | undefined> | null | undefined,
): AppRole[] {
  if (!raw) return [];
  const seen = new Set<AppRole>();
  for (const entry of raw) {
    const role = normalizeRole(entry);
    if (role) seen.add(role);
  }
  return [...seen];
}

/** True when any of the user's roles is in the allowed set. */
export function hasAnyRole(
  userRoles: ReadonlyArray<string | null | undefined> | null | undefined,
  allowed: ReadonlyArray<AppRole>,
): boolean {
  if (allowed.length === 0) return false;
  const normalized = normalizeRoles(userRoles);
  return normalized.some((role) => allowed.includes(role));
}

/** True when the user holds a staff role (Admin or SuperAdmin). */
export function isStaff(
  userRoles: ReadonlyArray<string | null | undefined> | null | undefined,
): boolean {
  return hasAnyRole(userRoles, STAFF_ROLES);
}

// Most-privileged first. Used to pick a single role for the role-aware nav
// filter, which compares against one current role.
const ROLE_PRIORITY: readonly AppRole[] = [
  'super_admin',
  'admin',
  'instructor',
  'parent',
  'student',
] as const;

/**
 * The user's highest-privilege role, or `undefined` if they have none we
 * recognise. Drives nav filtering, which keys off a single current role.
 */
export function primaryRole(
  userRoles: ReadonlyArray<string | null | undefined> | null | undefined,
): AppRole | undefined {
  const normalized = new Set(normalizeRoles(userRoles));
  return ROLE_PRIORITY.find((role) => normalized.has(role));
}

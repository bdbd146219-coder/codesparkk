import { STAFF_ROLES } from '@/lib/auth/roles';
import { RequireRole } from './RequireRole';

/**
 * Staff-only guard: Admin + SuperAdmin (see {@link STAFF_ROLES}). Instructor is
 * intentionally blocked in V1 — the catalog admin endpoints require
 * Admin/SuperAdmin policies on the backend, so the frontend mirrors that.
 */
export function RequireStaff() {
  return <RequireRole allow={STAFF_ROLES} />;
}

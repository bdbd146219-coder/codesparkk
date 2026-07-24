import { z } from 'zod';
import { ApiError, getValidationErrors } from '@/lib/api/errors';
import type { AdminCourseDetail, AssignCourseInstructorBody } from '@/lib/api/admin/courses';

/**
 * Pure form/error helpers for the Instructor assignment UI (C2I). Kept free of
 * React so the schema, the role helpers, and the 400/404 mapping can be
 * unit-tested without the dialog UI.
 */

/** A single assigned instructor as it appears on the loaded course detail. */
export type CourseInstructor = NonNullable<AdminCourseDetail['instructors']>[number];

export const INSTRUCTOR_ROLES = ['Lead', 'Assistant'] as const;
export type InstructorRole = (typeof INSTRUCTOR_ROLES)[number];

const V = 'staff.catalog.courses.detail.instructors.validation';
const ERR = 'staff.catalog.courses.detail.instructors.error';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InstructorFormValues {
  instructorUserId: string;
  roleOnCourse: string;
}

export const DEFAULT_INSTRUCTOR_FORM: InstructorFormValues = {
  instructorUserId: '',
  roleOnCourse: 'Lead',
};

/** i18n key for a role's badge/label, falling back to the raw value. */
export function instructorRoleKey(role: string | null | undefined): string {
  if (!role) return '';
  return `staff.catalog.enums.instructorRole.${role}`;
}

/** Lead is visually prominent (it gates publishing); Assistant is secondary. */
export function instructorRoleBadgeVariant(
  role: string | null | undefined,
): 'default' | 'secondary' {
  return role === 'Lead' ? 'default' : 'secondary';
}

/** True when at least one Lead instructor is assigned (mirrors publish readiness). */
export function hasLeadInstructor(course: AdminCourseDetail): boolean {
  return (course.instructors ?? []).some((i) => i.role === 'Lead');
}

export const instructorFormSchema = z.object({
  instructorUserId: z
    .string()
    .trim()
    .min(1, { message: V + '.idRequired' })
    .regex(UUID_RE, { message: V + '.idFormat' }),
  roleOnCourse: z.string().refine((v) => (INSTRUCTOR_ROLES as readonly string[]).includes(v), {
    message: V + '.roleRequired',
  }),
});

export function formToAssignBody(
  values: InstructorFormValues,
  rowVersion: string | null | undefined,
): AssignCourseInstructorBody {
  return {
    rowVersion: rowVersion ?? '',
    instructorUserId: values.instructorUserId.trim(),
    roleOnCourse: values.roleOnCourse,
  };
}

const SERVER_FIELD_MAP: Record<string, keyof InstructorFormValues> = {
  instructoruserid: 'instructorUserId',
  roleoncourse: 'roleOnCourse',
};

export interface MappedInstructorErrors {
  fields: { field: keyof InstructorFormValues; message: string }[];
  unmapped: string[];
}

/** Split a 400 ValidationProblemDetails into per-field errors and a remainder. */
export function mapInstructorServerErrors(error: unknown): MappedInstructorErrors | null {
  const errors = getValidationErrors(error);
  if (!errors) return null;
  const fields: MappedInstructorErrors['fields'] = [];
  const unmapped: string[] = [];
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages[0] ?? '';
    const normalized =
      key
        .split('.')[0]
        ?.replace(/\[\d+\]$/, '')
        .toLowerCase() ?? '';
    const field = SERVER_FIELD_MAP[normalized];
    if (field) fields.push({ field, message });
    else unmapped.push(message);
  }
  return { fields, unmapped };
}

/** True for a 404 — the user id didn't resolve to an assignable instructor. */
export function isInstructorNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Map a non-concurrency, non-404, non-validation failure to a safe key. */
export function instructorErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return `${ERR}.invalidState`;
    if (error.status === 401 || error.status === 403) return `${ERR}.forbidden`;
    if (error.status === 404) return `${ERR}.notFound`;
  }
  return `${ERR}.generic`;
}

export type InstructorFeedback = 'assigned' | 'removed';

/** Dev-only overrides that force instructor visual states for screenshot QA. */
export interface InstructorDemo {
  /** Render the assign dialog open. */
  dialog?: boolean;
  /** Render the remove-confirmation dialog open. */
  remove?: boolean;
  /** Show the dialog's Assign button in its loading state. */
  saving?: boolean;
  /** Pre-populate a user-id validation error in the open dialog. */
  invalid?: boolean;
  /** Show the optimistic-concurrency conflict alert. */
  conflict?: boolean;
  /** Show success feedback for this action. */
  feedback?: InstructorFeedback;
}

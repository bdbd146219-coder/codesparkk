import { z } from 'zod';
import { ApiError, getValidationErrors } from '@/lib/api/errors';
import type {
  AddCourseModuleBody,
  AdminCourseDetail,
  UpdateCourseModuleBody,
} from '@/lib/api/admin/courses';

/**
 * Pure form/reorder/error helpers for the Modules management UI (C2H). Kept
 * free of React so the schema, the move-up/down ordering, and the 400→field
 * mapping can be unit-tested without the dialog UI.
 */

/** A single module as it appears on the loaded course detail. */
export type CourseModule = NonNullable<AdminCourseDetail['modules']>[number];

const V = 'staff.catalog.courses.detail.modules.validation';
const ERR = 'staff.catalog.courses.detail.modules.error';

export interface ModuleFormValues {
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
}

const s = (value: string | null | undefined): string => value ?? '';
const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Course modules sorted by their server `order` (stable, missing → 0). */
export function sortedModules(course: AdminCourseDetail): CourseModule[] {
  return [...(course.modules ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Build add/edit form defaults from a module (or blanks for a new module). */
export function moduleToForm(module: CourseModule | null | undefined): ModuleFormValues {
  return {
    titleEn: s(module?.titleEn),
    titleAr: s(module?.titleAr),
    summaryEn: s(module?.summaryEn),
    summaryAr: s(module?.summaryAr),
  };
}

export function formToAddBody(
  values: ModuleFormValues,
  rowVersion: string | null | undefined,
): AddCourseModuleBody {
  return {
    rowVersion: rowVersion ?? '',
    titleEn: values.titleEn.trim(),
    titleAr: nullable(values.titleAr),
    summaryEn: nullable(values.summaryEn),
    summaryAr: nullable(values.summaryAr),
  };
}

export function formToUpdateBody(
  values: ModuleFormValues,
  rowVersion: string | null | undefined,
): UpdateCourseModuleBody {
  return {
    rowVersion: rowVersion ?? '',
    titleEn: values.titleEn.trim(),
    titleAr: nullable(values.titleAr),
    summaryEn: nullable(values.summaryEn),
    summaryAr: nullable(values.summaryAr),
  };
}

/**
 * Build the reordered `orderedModuleIds` array after moving the module at
 * `index` up or down by one. Returns null when the move is out of bounds or any
 * module is missing an id (so the caller can no-op rather than send a bad body).
 */
export function moveModuleIds(
  modules: CourseModule[],
  index: number,
  direction: 'up' | 'down',
): string[] | null {
  const ids = modules.map((m) => m.id).filter((id): id is string => Boolean(id));
  if (ids.length !== modules.length) return null;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  const moved = next[index] as string;
  next[index] = next[target] as string;
  next[target] = moved;
  return next;
}

export const moduleFormSchema = z.object({
  titleEn: z
    .string()
    .trim()
    .min(1, { message: V + '.titleRequired' })
    .max(160, { message: V + '.tooLong' }),
  titleAr: z
    .string()
    .trim()
    .max(160, { message: V + '.tooLong' }),
  summaryEn: z
    .string()
    .trim()
    .max(500, { message: V + '.tooLong' }),
  summaryAr: z
    .string()
    .trim()
    .max(500, { message: V + '.tooLong' }),
});

const SERVER_FIELD_MAP: Record<string, keyof ModuleFormValues> = {
  titleen: 'titleEn',
  titlear: 'titleAr',
  summaryen: 'summaryEn',
  summaryar: 'summaryAr',
};

export interface MappedModuleErrors {
  fields: { field: keyof ModuleFormValues; message: string }[];
  unmapped: string[];
}

/**
 * Split a 400 ValidationProblemDetails into per-field module errors and an
 * unmapped remainder. Returns null when the error isn't a field-validation
 * problem (the caller then treats it as a generic failure).
 */
export function mapModuleServerErrors(error: unknown): MappedModuleErrors | null {
  const errors = getValidationErrors(error);
  if (!errors) return null;
  const fields: MappedModuleErrors['fields'] = [];
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

/** Map a non-concurrency module failure (reorder/remove/other) to a safe key. */
export function moduleErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return `${ERR}.invalidState`;
    if (error.status === 401 || error.status === 403) return `${ERR}.forbidden`;
    if (error.status === 404) return `${ERR}.notFound`;
  }
  return `${ERR}.generic`;
}

export type ModuleFeedback = 'added' | 'updated' | 'removed' | 'reordered';

/** Dev-only overrides that force module visual states for screenshot QA. */
export interface ModuleDemo {
  /** Render the add/edit dialog open. */
  dialog?: 'add' | 'edit';
  /** Render the remove-confirmation dialog open. */
  remove?: boolean;
  /** Show the dialog's Save button in its loading state. */
  saving?: boolean;
  /** Pre-populate a title validation error in the open dialog. */
  invalid?: boolean;
  /** Show the optimistic-concurrency conflict alert. */
  conflict?: boolean;
  /** Show success feedback for this action. */
  feedback?: ModuleFeedback;
}

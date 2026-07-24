import { z } from 'zod';
import { ApiError, getValidationErrors } from '@/lib/api/errors';
import type { AddLearningPathItemBody } from '@/lib/api/admin/learning-paths';
import type { LearningPathItem } from '../detail-helpers';

/**
 * Pure form / reorder / error helpers for the learning-path Items manager (C3E),
 * mirroring the course Modules helpers (C2H). Kept free of React so the schema,
 * the move-up/down ordering, and the error mapping can be unit-tested without
 * the dialog UI.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const V = 'staff.catalog.learningPaths.detail.items.validation';
const ERR = 'staff.catalog.learningPaths.detail.items.error';

export interface AddItemFormValues {
  courseId: string;
  note: string;
}

const nullable = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Blank defaults for the add-item dialog. */
export function addItemDefaults(): AddItemFormValues {
  return { courseId: '', note: '' };
}

/** Build the add-item POST body from the form + the path's current rowVersion. */
export function formToAddItemBody(
  values: AddItemFormValues,
  rowVersion: string | null | undefined,
): AddLearningPathItemBody {
  return {
    rowVersion: rowVersion ?? '',
    courseId: values.courseId.trim(),
    note: nullable(values.note),
  };
}

/**
 * Build the reordered `orderedItemIds` array after moving the item at `index`
 * up or down by one. Returns null when the move is out of bounds or any item is
 * missing an id (so the caller can no-op rather than send a bad body).
 */
export function moveItemIds(
  items: LearningPathItem[],
  index: number,
  direction: 'up' | 'down',
): string[] | null {
  const ids = items.map((i) => i.id).filter((id): id is string => Boolean(id));
  if (ids.length !== items.length) return null;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  const moved = next[index] as string;
  next[index] = next[target] as string;
  next[target] = moved;
  return next;
}

export const addItemFormSchema = z.object({
  courseId: z
    .string()
    .trim()
    .min(1, { message: V + '.courseIdRequired' })
    .refine((v) => UUID_RE.test(v), { message: V + '.courseIdFormat' }),
  note: z
    .string()
    .trim()
    .max(300, { message: V + '.tooLong' }),
});

const SERVER_FIELD_MAP: Record<string, keyof AddItemFormValues> = {
  courseid: 'courseId',
  note: 'note',
};

export interface MappedAddItemErrors {
  fields: { field: keyof AddItemFormValues; message: string }[];
  unmapped: string[];
}

/**
 * Split a 400 ValidationProblemDetails into per-field add-item errors and an
 * unmapped remainder. Returns null when the error isn't a field-validation
 * problem (the caller then classifies it — duplicate / not-found / generic).
 */
export function mapAddItemServerErrors(error: unknown): MappedAddItemErrors | null {
  const errors = getValidationErrors(error);
  if (!errors) return null;
  const fields: MappedAddItemErrors['fields'] = [];
  const unmapped: string[] = [];
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages[0] ?? '';
    const normalized = key.split('.')[0]?.toLowerCase() ?? '';
    const field = SERVER_FIELD_MAP[normalized];
    if (field) fields.push({ field, message });
    else unmapped.push(message);
  }
  return { fields, unmapped };
}

/** Map a non-concurrency remove/reorder failure to a safe i18n key. */
export function itemErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return `${ERR}.invalidState`;
    if (error.status === 401 || error.status === 403) return `${ERR}.forbidden`;
    if (error.status === 404) return `${ERR}.notFound`;
  }
  return `${ERR}.generic`;
}

export type ItemFeedback = 'added' | 'removed' | 'reordered';

/** Dev-only overrides that force item visual states for screenshot QA. */
export interface ItemsDemo {
  /** Render the add-item dialog open. */
  dialog?: boolean;
  /** Render the remove-confirmation dialog open. */
  remove?: boolean;
  /** Show the dialog's Add button in its loading state. */
  saving?: boolean;
  /** Pre-populate a courseId validation error in the open dialog. */
  invalid?: boolean;
  /** Show the "already in path" duplicate error in the open dialog. */
  duplicate?: boolean;
  /** Show the "no course found" not-found error in the open dialog. */
  notFound?: boolean;
  /** Show the optimistic-concurrency conflict alert. */
  conflict?: boolean;
  /** Show success feedback for this action. */
  feedback?: ItemFeedback;
}

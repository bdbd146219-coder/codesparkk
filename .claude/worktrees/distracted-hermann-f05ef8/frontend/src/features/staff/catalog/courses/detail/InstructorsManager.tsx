import { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, Trash2, UserPlus, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { isConcurrencyError } from '@/lib/api/errors';
import { useAssignCourseInstructor, useRemoveCourseInstructor } from '@/features/staff/catalog/api';
import type { AdminCourseDetail } from '@/lib/api/admin/courses';
import { ConcurrencyAlert } from '../ConcurrencyAlert';
import {
  DEFAULT_INSTRUCTOR_FORM,
  INSTRUCTOR_ROLES,
  formToAssignBody,
  instructorErrorKey,
  instructorFormSchema,
  instructorRoleBadgeVariant,
  instructorRoleKey,
  isInstructorNotFound,
  mapInstructorServerErrors,
  type CourseInstructor,
  type InstructorDemo,
  type InstructorFeedback,
  type InstructorFormValues,
} from './instructors';

const KEY = 'staff.catalog.courses.detail.instructors';

export interface InstructorsManagerProps {
  course: AdminCourseDetail;
  onReloadLatest: () => void;
  /** Dev-only display overrides for visual QA (live path never passes this). */
  demo?: InstructorDemo;
}

/**
 * Functional Instructors tab. Assign an instructor by user id + course role and
 * remove assignments, each through a focus-trapped dialog. Every mutation
 * carries the current course rowVersion; the hooks return the full course
 * detail and seed the cache, so the list and the publish-readiness checklist
 * (which requires a Lead) update together. 409 surfaces the shared
 * ConcurrencyAlert with a reload — never an auto-retry or silent overwrite.
 */
export function InstructorsManager({ course, onReloadLatest, demo }: InstructorsManagerProps) {
  const { t } = useTranslation();
  const instructors = course.instructors ?? [];

  const assign = useAssignCourseInstructor();
  const remove = useRemoveCourseInstructor();

  const [assigning, setAssigning] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<CourseInstructor | null>(null);
  const [feedback, setFeedback] = useState<InstructorFeedback | null>(null);
  const [conflict, setConflict] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Fresh server data clears transient errors; feedback is intentionally sticky.
  useEffect(() => {
    setConflict(false);
    setErrorKey(null);
  }, [course.rowVersion]);

  const courseId = course.id ?? '';
  const rowVersion = course.rowVersion ?? null;

  const clearTransient = () => {
    setFeedback(null);
    setConflict(false);
    setErrorKey(null);
  };

  const openAssign = () => {
    clearTransient();
    setAssigning(true);
  };

  // assign save — rejects with the ApiError so the dialog can map 400/404 to
  // fields; success closes the dialog and records feedback here.
  const saveAssignment = async (values: InstructorFormValues) => {
    clearTransient();
    await assign.mutateAsync({ id: courseId, body: formToAssignBody(values, rowVersion) });
    setFeedback('assigned');
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    clearTransient();
    remove.mutate(
      { id: courseId, instructorUserId: removeTarget.instructorUserId ?? '', body: { rowVersion } },
      {
        onSuccess: () => {
          setRemoveTarget(null);
          setFeedback('removed');
        },
        onError: (err) => {
          setRemoveTarget(null);
          if (isConcurrencyError(err)) {
            setConflict(true);
            return;
          }
          setErrorKey(instructorErrorKey(err));
        },
      },
    );
  };

  const handleReload = () => {
    setConflict(false);
    setErrorKey(null);
    setAssigning(false);
    setRemoveTarget(null);
    onReloadLatest();
  };

  // Demo overrides for visual QA — the live path leaves `demo` undefined.
  const showAssign = demo?.dialog ?? assigning;
  const renderRemove = demo?.remove ? (instructors[0] ?? null) : removeTarget;
  const showConflict = demo?.conflict ?? conflict;
  const activeFeedback = demo?.feedback ?? feedback;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{t(`${KEY}.heading`)}</h2>
          <p className="text-sm text-muted-foreground">{t(`${KEY}.lead`)}</p>
        </div>
        {instructors.length > 0 ? (
          <Button type="button" size="sm" onClick={openAssign} className="shrink-0">
            <UserPlus aria-hidden="true" />
            {t(`${KEY}.assign`)}
          </Button>
        ) : null}
      </div>

      {activeFeedback ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground"
        >
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
          {t(`${KEY}.feedback.${activeFeedback}`)}
        </div>
      ) : null}

      {showConflict ? <ConcurrencyAlert onReload={handleReload} /> : null}

      {errorKey ? (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <p className="text-sm font-semibold text-foreground">{t(`${KEY}.error.title`)}</p>
          <p className="text-sm text-muted-foreground">{t(errorKey)}</p>
        </div>
      ) : null}

      {instructors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">{t(`${KEY}.empty`)}</p>
            <Button type="button" variant="outline" size="sm" onClick={openAssign}>
              <UserPlus aria-hidden="true" />
              {t(`${KEY}.assign`)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {instructors.map((instructor, index) => (
            <li key={instructor.instructorUserId ?? index}>
              <InstructorCard
                instructor={instructor}
                onRemove={() => {
                  clearTransient();
                  setRemoveTarget(instructor);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {showAssign ? (
        <AssignInstructorDialog
          onSave={saveAssignment}
          onSuccess={() => setAssigning(false)}
          onConflict={() => {
            setAssigning(false);
            setConflict(true);
          }}
          onCancel={() => setAssigning(false)}
          demoSaving={demo?.saving}
          demoInvalid={demo?.invalid}
        />
      ) : null}

      {renderRemove ? (
        <RemoveInstructorDialog
          instructor={renderRemove}
          pending={demo?.remove ? Boolean(demo.saving) : remove.isPending}
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      ) : null}
    </div>
  );
}

function InstructorCard({
  instructor,
  onRemove,
}: {
  instructor: CourseInstructor;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const roleKey = instructorRoleKey(instructor.role);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t(`${KEY}.userIdLabel`)}</p>
            <p className="truncate font-mono text-sm text-foreground" dir="ltr">
              {instructor.instructorUserId}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          {instructor.role ? (
            <Badge variant={instructorRoleBadgeVariant(instructor.role)}>
              {roleKey ? t(roleKey, { defaultValue: instructor.role }) : instructor.role}
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
            {t(`${KEY}.remove`)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function useInstructorFieldError(name: keyof InstructorFormValues): string | undefined {
  const { t } = useTranslation();
  const {
    formState: { errors },
  } = useFormContext<InstructorFormValues>();
  const message = (errors as Record<string, { message?: string } | undefined>)[name]?.message;
  return message ? t(message, { defaultValue: message }) : undefined;
}

function InstructorIdField() {
  const { t } = useTranslation();
  const { register } = useFormContext<InstructorFormValues>();
  const error = useInstructorFieldError('instructorUserId');
  const id = 'instructor-user-id';
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {t(`${KEY}.fields.userId`)}
        <span aria-hidden="true" className="ms-1 text-destructive">
          *
        </span>
      </Label>
      <Input
        id={id}
        dir="ltr"
        className="font-mono"
        placeholder="00000000-0000-0000-0000-000000000000"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        {...register('instructorUserId')}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {t(`${KEY}.fields.userIdHint`)}
        </p>
      )}
    </div>
  );
}

function RoleField() {
  const { t } = useTranslation();
  const { control } = useFormContext<InstructorFormValues>();
  const error = useInstructorFieldError('roleOnCourse');
  return (
    <Controller
      control={control}
      name="roleOnCourse"
      render={({ field }) => (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-foreground">
            {t(`${KEY}.fields.role`)}
            <span aria-hidden="true" className="ms-1 text-destructive">
              *
            </span>
          </legend>
          <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INSTRUCTOR_ROLES.map((role) => {
              const selected = field.value === role;
              return (
                <label
                  key={role}
                  className={cn(
                    'flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 transition-colors duration-fast',
                    'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-input hover:bg-secondary/50',
                  )}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={role}
                    checked={selected}
                    onChange={() => field.onChange(role)}
                    onBlur={field.onBlur}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {t(`staff.catalog.enums.instructorRole.${role}`)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(`${KEY}.roleHint.${role}`)}
                  </span>
                </label>
              );
            })}
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </fieldset>
      )}
    />
  );
}

function AssignInstructorDialog({
  onSave,
  onSuccess,
  onConflict,
  onCancel,
  demoSaving,
  demoInvalid,
}: {
  onSave: (values: InstructorFormValues) => Promise<void>;
  onSuccess: () => void;
  onConflict: () => void;
  onCancel: () => void;
  demoSaving?: boolean;
  demoInvalid?: boolean;
}) {
  const { t } = useTranslation();
  const form = useForm<InstructorFormValues>({
    resolver: zodResolver(instructorFormSchema),
    defaultValues: DEFAULT_INSTRUCTOR_FORM,
    mode: 'onBlur',
  });
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const [genericError, setGenericError] = useState(false);

  useEffect(() => {
    // Run real validation so the demo mirrors a failed submit on an empty id.
    if (demoInvalid) void form.trigger('instructorUserId');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoInvalid]);

  const submit = form.handleSubmit(async (values) => {
    setUnmapped([]);
    setGenericError(false);
    try {
      await onSave(values);
      onSuccess();
    } catch (err) {
      if (isConcurrencyError(err)) {
        onConflict();
        return;
      }
      if (isInstructorNotFound(err)) {
        form.setError('instructorUserId', { message: `${KEY}.validation.idNotFound` });
        return;
      }
      const mapped = mapInstructorServerErrors(err);
      if (mapped) {
        mapped.fields.forEach((f) => form.setError(f.field, { message: f.message }));
        setUnmapped(mapped.unmapped);
        return;
      }
      setGenericError(true);
    }
  });

  const base = `${KEY}.dialog`;
  const saving = Boolean(demoSaving) || form.formState.isSubmitting;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !saving) onCancel();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`${base}.title`)}</DialogTitle>
          <DialogDescription>{t(`${base}.body`)}</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <InstructorIdField />
            <RoleField />

            {genericError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {t(`${KEY}.error.generic`)}
              </p>
            ) : null}
            {unmapped.length > 0 ? (
              <ul
                role="alert"
                className="list-inside list-disc rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {unmapped.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
                {t(`${base}.cancel`)}
              </Button>
              <Button type="submit" disabled={saving || !form.formState.isDirty}>
                {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {saving ? t(`${base}.saving`) : t(`${base}.confirm`)}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function RemoveInstructorDialog({
  instructor,
  pending,
  onConfirm,
  onCancel,
}: {
  instructor: CourseInstructor;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <DialogContent className="max-w-md" role="alertdialog">
        <DialogHeader>
          <DialogTitle>{t(`${KEY}.removeDialog.title`)}</DialogTitle>
          <DialogDescription>{t(`${KEY}.removeDialog.body`)}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-surface/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground">{t(`${KEY}.userIdLabel`)}</p>
          <p className="truncate font-mono text-foreground" dir="ltr">
            {instructor.instructorUserId}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {t(`${KEY}.dialog.cancel`)}
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            {pending ? t(`${KEY}.removeDialog.working`) : t(`${KEY}.removeDialog.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

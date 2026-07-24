import type { ReactNode } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextAreaField, TextField } from './fields';
import type { CourseFormValues } from './course-form';

function BilingualGroup({ headingKey, children }: { headingKey: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{t(headingKey)}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

export function ContentForm({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const { control, register, formState } = useFormContext<CourseFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'outcomes' });

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base">
            {t('staff.catalog.courses.detail.tabs.content')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <BilingualGroup headingKey="staff.catalog.courses.detail.content.title">
            <TextField
              name="titleEn"
              labelKey="staff.catalog.courses.detail.content.langEn"
              required
              disabled={disabled}
              dir="ltr"
            />
            <TextField
              name="titleAr"
              labelKey="staff.catalog.courses.detail.content.langAr"
              disabled={disabled}
              dir="rtl"
            />
          </BilingualGroup>

          <BilingualGroup headingKey="staff.catalog.courses.detail.content.subtitle">
            <TextField
              name="subtitleEn"
              labelKey="staff.catalog.courses.detail.content.langEn"
              disabled={disabled}
              dir="ltr"
            />
            <TextField
              name="subtitleAr"
              labelKey="staff.catalog.courses.detail.content.langAr"
              disabled={disabled}
              dir="rtl"
            />
          </BilingualGroup>

          <BilingualGroup headingKey="staff.catalog.courses.detail.content.summary">
            <TextAreaField
              name="summaryEn"
              labelKey="staff.catalog.courses.detail.content.langEn"
              disabled={disabled}
              dir="ltr"
            />
            <TextAreaField
              name="summaryAr"
              labelKey="staff.catalog.courses.detail.content.langAr"
              disabled={disabled}
              dir="rtl"
            />
          </BilingualGroup>

          <BilingualGroup headingKey="staff.catalog.courses.detail.content.description">
            <TextAreaField
              name="descriptionEn"
              labelKey="staff.catalog.courses.detail.content.langEn"
              disabled={disabled}
              dir="ltr"
              rows={6}
            />
            <TextAreaField
              name="descriptionAr"
              labelKey="staff.catalog.courses.detail.content.langAr"
              disabled={disabled}
              dir="rtl"
              rows={6}
            />
          </BilingualGroup>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">
            {t('staff.catalog.courses.detail.content.outcomes')}
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => append({ textEn: '', textAr: '' })}
          >
            <Plus aria-hidden="true" />
            {t('staff.catalog.courses.edit.outcomes.add')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('staff.catalog.courses.edit.outcomes.empty')}
            </p>
          ) : (
            fields.map((row, i) => {
              const enError = formState.errors.outcomes?.[i]?.textEn?.message as string | undefined;
              const arError = formState.errors.outcomes?.[i]?.textAr?.message as string | undefined;
              return (
                <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor={`outcome-en-${i}`}>
                      {t('staff.catalog.courses.edit.outcomes.rowEn', { index: i + 1 })}
                    </Label>
                    <Input
                      id={`outcome-en-${i}`}
                      dir="ltr"
                      disabled={disabled}
                      aria-invalid={enError ? true : undefined}
                      {...register(`outcomes.${i}.textEn`)}
                    />
                    {enError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {t(enError, { defaultValue: enError })}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`outcome-ar-${i}`}>
                      {t('staff.catalog.courses.edit.outcomes.rowAr', { index: i + 1 })}
                    </Label>
                    <Input
                      id={`outcome-ar-${i}`}
                      dir="rtl"
                      disabled={disabled}
                      aria-invalid={arError ? true : undefined}
                      {...register(`outcomes.${i}.textAr`)}
                    />
                    {arError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {t(arError, { defaultValue: arError })}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    aria-label={t('staff.catalog.courses.edit.outcomes.remove', { index: i + 1 })}
                    onClick={() => remove(i)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

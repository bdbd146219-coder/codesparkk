import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AGE_BAND_VALUES,
  DELIVERY_VALUES,
  DIFFICULTY_VALUES,
} from '@/features/staff/catalog/courses/filters';
import { NumberField, SelectField, SwitchField, TextField } from './fields';

export interface OverviewFormProps {
  categoryOptions: { value: string; label: string }[];
  disabled?: boolean;
}

export function OverviewForm({ categoryOptions, disabled }: OverviewFormProps) {
  const { t } = useTranslation();

  const enumOptions = (values: readonly string[], group: string) =>
    values.map((v) => ({ value: v, label: t(`staff.catalog.enums.${group}.${v}`) }));

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base">
            {t('staff.catalog.courses.edit.sections.basics')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <TextField
            name="slug"
            labelKey="staff.catalog.courses.detail.overview.slug"
            hintKey="staff.catalog.courses.edit.fields.slugHint"
            disabled={disabled}
            dir="ltr"
          />
          <SelectField
            name="primaryCategoryId"
            labelKey="staff.catalog.courses.detail.overview.category"
            options={categoryOptions}
            disabled={disabled}
            required
          />
          <SelectField
            name="deliveryType"
            labelKey="staff.catalog.courses.detail.overview.delivery"
            options={enumOptions(DELIVERY_VALUES, 'deliveryType')}
            disabled={disabled}
            required
          />
          <SelectField
            name="difficulty"
            labelKey="staff.catalog.courses.detail.overview.difficulty"
            options={enumOptions(DIFFICULTY_VALUES, 'difficulty')}
            disabled={disabled}
            required
          />
          <SelectField
            name="ageBand"
            labelKey="staff.catalog.courses.detail.overview.ageBand"
            options={enumOptions(AGE_BAND_VALUES, 'ageBand')}
            disabled={disabled}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              name="minAge"
              labelKey="staff.catalog.courses.edit.fields.minAge"
              disabled={disabled}
            />
            <NumberField
              name="maxAge"
              labelKey="staff.catalog.courses.edit.fields.maxAge"
              disabled={disabled}
            />
          </div>
          <div className="sm:col-span-2">
            <SwitchField
              name="isListed"
              labelKey="staff.catalog.courses.detail.overview.visibility"
              descriptionKey="staff.catalog.courses.edit.fields.isListedHint"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base">
            {t('staff.catalog.courses.edit.sections.media')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <TextField
            name="thumbnailKey"
            labelKey="staff.catalog.courses.edit.fields.thumbnailKey"
            disabled={disabled}
            dir="ltr"
          />
          <TextField
            name="thumbnailAlt"
            labelKey="staff.catalog.courses.edit.fields.thumbnailAlt"
            disabled={disabled}
          />
          <TextField
            name="heroKey"
            labelKey="staff.catalog.courses.edit.fields.heroKey"
            disabled={disabled}
            dir="ltr"
          />
          <TextField
            name="promoVideoUrl"
            labelKey="staff.catalog.courses.edit.fields.promoVideoUrl"
            hintKey="staff.catalog.courses.edit.fields.promoVideoHint"
            disabled={disabled}
            dir="ltr"
          />
        </CardContent>
      </Card>
    </div>
  );
}

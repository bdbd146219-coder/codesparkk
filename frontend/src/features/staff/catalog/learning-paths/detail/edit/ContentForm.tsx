import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextAreaField, TextField } from './fields';

const KEY = 'staff.catalog.learningPaths.detail.content';

function BilingualGroup({ headingKey, children }: { headingKey: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{t(headingKey)}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

/**
 * Editable bilingual content: title (required English) and summary. The learning
 * path model has no long description (C3C finding), so none is rendered.
 */
export function ContentForm({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-base">{t(`${KEY}.heading`)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <BilingualGroup headingKey={`${KEY}.title`}>
          <TextField
            name="titleEn"
            labelKey={`${KEY}.langEn`}
            required
            disabled={disabled}
            dir="ltr"
          />
          <TextField name="titleAr" labelKey={`${KEY}.langAr`} disabled={disabled} dir="rtl" />
        </BilingualGroup>

        <BilingualGroup headingKey={`${KEY}.summary`}>
          <TextAreaField
            name="summaryEn"
            labelKey={`${KEY}.langEn`}
            disabled={disabled}
            dir="ltr"
            rows={4}
          />
          <TextAreaField
            name="summaryAr"
            labelKey={`${KEY}.langAr`}
            disabled={disabled}
            dir="rtl"
            rows={4}
          />
        </BilingualGroup>
      </CardContent>
    </Card>
  );
}

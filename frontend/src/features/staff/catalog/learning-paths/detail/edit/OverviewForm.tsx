import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublishStateBadge } from '../../../courses/badges';
import { AGE_BAND_VALUES } from '../../filters';
import { formatDate, sortedItems, type AdminLearningPathDetail } from '../detail-helpers';
import { MetaItem } from '../panels';
import { MediaUploadField } from '@/features/staff/catalog/components/MediaUploadField';
import { SelectField, SwitchField, TextField } from './fields';

const KEY = 'staff.catalog.learningPaths';

export interface OverviewFormProps {
  path: AdminLearningPathDetail;
  lang: string;
  /** True when the whole form is locked (archived or saving). */
  disabled?: boolean;
}

/**
 * Editable overview: slug (draft-only), age band, visibility (published-only),
 * and media — plus a read-only metadata card. The slug and visibility controls
 * mirror the backend state rules so the user never trips an invalid-state 400.
 */
export function OverviewForm({ path, lang, disabled }: OverviewFormProps) {
  const { t } = useTranslation();

  const slugLocked = path.publishState !== 'Draft';
  const listedLocked = path.publishState !== 'Published';

  const ageBandOptions = AGE_BAND_VALUES.map((v) => ({
    value: v,
    label: t(`staff.catalog.enums.ageBand.${v}`),
  }));

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base">{t(`${KEY}.edit.sections.basics`)}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <TextField
            name="slug"
            labelKey={`${KEY}.detail.overview.slug`}
            hintKey={
              slugLocked ? `${KEY}.edit.fields.slugLockedHint` : `${KEY}.edit.fields.slugHint`
            }
            disabled={disabled || slugLocked}
            dir="ltr"
          />
          <SelectField
            name="ageBand"
            labelKey={`${KEY}.detail.overview.ageBand`}
            options={ageBandOptions}
            disabled={disabled}
            required
          />
          <div className="sm:col-span-2">
            <SwitchField
              name="isListed"
              labelKey={`${KEY}.detail.overview.visibility`}
              descriptionKey={
                listedLocked
                  ? `${KEY}.edit.fields.isListedLockedHint`
                  : `${KEY}.edit.fields.isListedHint`
              }
              disabled={disabled || listedLocked}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base">{t(`${KEY}.edit.sections.media`)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="sm:max-w-md">
            <MediaUploadField
              kind="learning-path-thumbnail"
              keyField="thumbnailKey"
              contextField="slug"
              labelKey="staff.catalog.media.thumbnailLabel"
              previewKind="path"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <TextField
              name="thumbnailKey"
              labelKey={`${KEY}.detail.overview.thumbnailKey`}
              disabled={disabled}
              dir="ltr"
            />
            <TextField
              name="thumbnailAlt"
              labelKey={`${KEY}.detail.overview.thumbnailAlt`}
              disabled={disabled}
            />
            <TextField
              name="heroKey"
              labelKey={`${KEY}.detail.overview.heroKey`}
              disabled={disabled}
              dir="ltr"
            />
            <TextField
              name="promoVideoUrl"
              labelKey={`${KEY}.detail.overview.promoVideoUrl`}
              hintKey={`${KEY}.edit.fields.promoVideoHint`}
              disabled={disabled}
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t(`${KEY}.edit.sections.details`)}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem label={t(`${KEY}.detail.overview.status`)}>
              <PublishStateBadge value={path.publishState} />
            </MetaItem>
            <MetaItem label={t(`${KEY}.detail.overview.courses`)}>
              <span className="tabular-nums">{sortedItems(path).length}</span>
            </MetaItem>
            <MetaItem label={t(`${KEY}.detail.overview.created`)}>
              <bdi>{formatDate(path.createdAt, lang)}</bdi>
            </MetaItem>
            <MetaItem label={t(`${KEY}.detail.overview.updated`)}>
              <bdi>{formatDate(path.updatedAt, lang)}</bdi>
            </MetaItem>
            <MetaItem label={t(`${KEY}.detail.overview.published`)}>
              <bdi>{formatDate(path.publishedAt, lang)}</bdi>
            </MetaItem>
            <MetaItem label={t(`${KEY}.detail.overview.archived`)}>
              <bdi>{formatDate(path.archivedAt, lang)}</bdi>
            </MetaItem>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

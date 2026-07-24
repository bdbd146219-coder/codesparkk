import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  ageBandKey,
  deliveryTypeKey,
  difficultyKey,
  isI18nKey,
  listedKey,
  publishStateMeta,
} from './badge-meta';

/** Renders an em dash for a missing value so columns never collapse. */
function MissingValue() {
  return <span className="text-muted-foreground">—</span>;
}

export function PublishStateBadge({ value }: { value: string | null | undefined }) {
  const { t } = useTranslation();
  const meta = publishStateMeta(value);
  if (!meta) return <MissingValue />;
  return <Badge variant={meta.variant}>{isI18nKey(meta.key) ? t(meta.key) : meta.key}</Badge>;
}

export function ListedBadge({ isListed }: { isListed: boolean | undefined }) {
  const { t } = useTranslation();
  return <Badge variant={isListed ? 'default' : 'outline'}>{t(listedKey(isListed))}</Badge>;
}

export function DeliveryTypeBadge({ value }: { value: string | null | undefined }) {
  const { t } = useTranslation();
  const key = deliveryTypeKey(value);
  if (!key) return <MissingValue />;
  return <Badge variant="outline">{isI18nKey(key) ? t(key) : key}</Badge>;
}

export function DifficultyBadge({ value }: { value: string | null | undefined }) {
  const { t } = useTranslation();
  const key = difficultyKey(value);
  if (!key) return <MissingValue />;
  return <Badge variant="secondary">{isI18nKey(key) ? t(key) : key}</Badge>;
}

export function AgeBandBadge({ value }: { value: string | null | undefined }) {
  const { t } = useTranslation();
  const key = ageBandKey(value);
  if (!key) return <MissingValue />;
  return <Badge variant="outline">{isI18nKey(key) ? t(key) : key}</Badge>;
}

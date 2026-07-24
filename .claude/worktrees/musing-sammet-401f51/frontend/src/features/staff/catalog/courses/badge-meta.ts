import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export interface BadgeMeta {
  key: string;
  variant: BadgeVariant;
}

const PUBLISH_STATE: Record<string, BadgeMeta> = {
  Draft: { key: 'staff.catalog.enums.publishState.Draft', variant: 'secondary' },
  InReview: { key: 'staff.catalog.enums.publishState.InReview', variant: 'warning' },
  Published: { key: 'staff.catalog.enums.publishState.Published', variant: 'success' },
  Archived: { key: 'staff.catalog.enums.publishState.Archived', variant: 'outline' },
};

const DELIVERY_TYPE: Record<string, string> = {
  Recorded: 'staff.catalog.enums.deliveryType.Recorded',
  Live: 'staff.catalog.enums.deliveryType.Live',
  Hybrid: 'staff.catalog.enums.deliveryType.Hybrid',
};

const DIFFICULTY: Record<string, string> = {
  Beginner: 'staff.catalog.enums.difficulty.Beginner',
  Intermediate: 'staff.catalog.enums.difficulty.Intermediate',
  Advanced: 'staff.catalog.enums.difficulty.Advanced',
};

const AGE_BAND: Record<string, string> = {
  Junior: 'staff.catalog.enums.ageBand.Junior',
  Explorer: 'staff.catalog.enums.ageBand.Explorer',
};

/** i18n key + badge variant for a publish state, or null when absent. */
export function publishStateMeta(value: string | null | undefined): BadgeMeta | null {
  if (!value) return null;
  return PUBLISH_STATE[value] ?? { key: value, variant: 'outline' };
}

/** i18n key for an enum-ish value from a label map, or the raw value / null. */
function labelKey(map: Record<string, string>, value: string | null | undefined): string | null {
  if (!value) return null;
  return map[value] ?? value;
}

export function deliveryTypeKey(value: string | null | undefined): string | null {
  return labelKey(DELIVERY_TYPE, value);
}
export function difficultyKey(value: string | null | undefined): string | null {
  return labelKey(DIFFICULTY, value);
}
export function ageBandKey(value: string | null | undefined): string | null {
  return labelKey(AGE_BAND, value);
}
export function listedKey(isListed: boolean | undefined): string {
  return isListed ? 'staff.catalog.enums.listed.listed' : 'staff.catalog.enums.listed.unlisted';
}

/** True when a key is an i18n path (vs a raw fallback value rendered verbatim). */
export function isI18nKey(key: string): boolean {
  return key.includes('.');
}

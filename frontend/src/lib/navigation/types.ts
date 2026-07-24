import type { LucideIcon } from 'lucide-react';

/**
 * Role surface for the platform. Used by nav config to declare which
 * surfaces an item belongs to. Role-based filtering is wired through
 * `filterByRole()` but is a no-op until auth lands in Phase B.
 */
export type AppRole = 'parent' | 'student' | 'instructor' | 'admin' | 'super_admin';

export interface NavItem {
  /** Internal route the item navigates to. Required unless `disabled` is true. */
  to?: string;
  /** Translation key for the visible label — never hardcode strings here. */
  i18nKey: string;
  /** Optional Lucide icon. */
  icon?: LucideIcon;
  /** If set, item is only visible to the listed roles. Undefined = visible to all. */
  roles?: ReadonlyArray<AppRole>;
  /** Optional translation key for a small badge ("soon", "new", count). */
  badgeI18nKey?: string;
  /** If true, the item renders but does not navigate. Used for future-feature placeholders. */
  disabled?: boolean;
  /** External link — opens in a new tab with rel="noopener". */
  external?: boolean;
}

export interface NavGroup {
  /** Optional group heading, translated. */
  i18nKey?: string;
  items: ReadonlyArray<NavItem>;
}

export interface NavConfig {
  /** Primary navigation — top bar / sidebar primary section. */
  primary: ReadonlyArray<NavGroup>;
  /** Utility navigation — settings, sign-out, secondary actions. */
  utility?: ReadonlyArray<NavItem>;
}

export function filterItems<T extends { roles?: ReadonlyArray<AppRole> }>(
  items: ReadonlyArray<T>,
  currentRole?: AppRole,
): ReadonlyArray<T> {
  if (!currentRole) return items;
  return items.filter((item) => !item.roles || item.roles.includes(currentRole));
}

export function filterGroups(
  groups: ReadonlyArray<NavGroup>,
  currentRole?: AppRole,
): ReadonlyArray<NavGroup> {
  return groups
    .map((g) => ({ ...g, items: filterItems(g.items, currentRole) }))
    .filter((g) => g.items.length > 0);
}

import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CreditCard,
  FolderTree,
  GraduationCap,
  Layers,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Users,
  Waypoints,
} from 'lucide-react';
import type { NavConfig } from './types';

/**
 * Productivity-shell navigation shared by instructor / admin / super-admin.
 * `roles` declares who sees each item — actual filtering kicks in when
 * auth resolves a current role in Phase B; until then everyone sees
 * everything when the shell is rendered standalone.
 *
 * The Parent dashboard is intentionally not represented here — it will
 * live in its own future shell (see docs/frontend-architecture.md).
 */
export const staffNav: NavConfig = {
  primary: [
    {
      i18nKey: 'nav.staff.groups.overview',
      items: [
        {
          to: '/staff',
          i18nKey: 'nav.staff.home',
          icon: Layers,
          roles: ['instructor', 'admin', 'super_admin'],
        },
        {
          i18nKey: 'nav.staff.analytics',
          icon: BarChart3,
          roles: ['admin', 'super_admin'],
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
      ],
    },
    {
      i18nKey: 'nav.staff.groups.catalog',
      items: [
        {
          to: '/staff/courses',
          i18nKey: 'nav.staff.courses',
          icon: BookOpen,
          roles: ['admin', 'super_admin'],
        },
        {
          to: '/staff/categories',
          i18nKey: 'nav.staff.categories',
          icon: FolderTree,
          roles: ['admin', 'super_admin'],
        },
        {
          to: '/staff/learning-paths',
          i18nKey: 'nav.staff.learningPaths',
          icon: Waypoints,
          roles: ['admin', 'super_admin'],
        },
      ],
    },
    {
      i18nKey: 'nav.staff.groups.teaching',
      items: [
        {
          i18nKey: 'nav.staff.students',
          icon: GraduationCap,
          roles: ['instructor', 'admin', 'super_admin'],
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.staff.liveSessions',
          icon: CalendarClock,
          roles: ['instructor', 'admin', 'super_admin'],
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
      ],
    },
    {
      i18nKey: 'nav.staff.groups.operations',
      items: [
        {
          i18nKey: 'nav.staff.users',
          icon: Users,
          roles: ['admin', 'super_admin'],
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.staff.payments',
          icon: CreditCard,
          roles: ['admin', 'super_admin'],
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.staff.support',
          icon: LifeBuoy,
          roles: ['admin', 'super_admin'],
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.staff.audit',
          icon: ShieldCheck,
          roles: ['super_admin'],
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
      ],
    },
  ],
  utility: [
    {
      i18nKey: 'nav.staff.settings',
      icon: Settings,
      roles: ['instructor', 'admin', 'super_admin'],
      disabled: true,
      badgeI18nKey: 'nav.common.soon',
    },
  ],
};

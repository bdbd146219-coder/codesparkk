import {
  BarChart3,
  Bell,
  CalendarCheck2,
  CreditCard,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import type { NavConfig } from './types';

/**
 * Parent shell navigation. Only the dashboard route is live for B1C; the
 * other items are deliberate "Soon" placeholders so the chrome reflects
 * the eventual surface (Children · Progress · Attendance · Payments ·
 * Reports · Notifications) without us shipping the dashboard itself.
 */
export const parentNav: NavConfig = {
  primary: [
    {
      i18nKey: 'nav.parent.groups.overview',
      items: [{ to: '/parent', i18nKey: 'nav.parent.dashboard', icon: Sparkles }],
    },
    {
      i18nKey: 'nav.parent.groups.family',
      items: [
        {
          i18nKey: 'nav.parent.children',
          icon: Users,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.parent.progress',
          icon: BarChart3,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.parent.attendance',
          icon: CalendarCheck2,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
      ],
    },
    {
      i18nKey: 'nav.parent.groups.account',
      items: [
        {
          i18nKey: 'nav.parent.payments',
          icon: CreditCard,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.parent.notifications',
          icon: Bell,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
      ],
    },
  ],
  utility: [
    {
      i18nKey: 'nav.parent.settings',
      icon: Settings,
      disabled: true,
      badgeI18nKey: 'nav.common.soon',
    },
  ],
};

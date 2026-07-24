import { Award, BookOpenCheck, Code2, Compass, GraduationCap, Sparkles } from 'lucide-react';
import type { NavConfig } from './types';

/**
 * Student shell navigation. Visible to the `student` role only.
 * Only the dashboard route is live for A3; the rest will activate as
 * features land in Phases D and E.
 */
export const studentNav: NavConfig = {
  primary: [
    {
      items: [
        { to: '/student', i18nKey: 'nav.student.dashboard', icon: Sparkles },
        {
          i18nKey: 'nav.student.learning',
          icon: GraduationCap,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.student.assignments',
          icon: BookOpenCheck,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.student.projects',
          icon: Compass,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.student.practice',
          icon: Code2,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.student.achievements',
          icon: Award,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
      ],
    },
  ],
};

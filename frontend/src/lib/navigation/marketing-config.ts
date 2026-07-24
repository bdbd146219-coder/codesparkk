import { BookOpen, Compass, Home, Mail, MessageCircleQuestion, Sparkles } from 'lucide-react';
import type { NavConfig } from './types';

/**
 * Public marketing navigation. The home route is live; everything else is
 * scaffolded as a "coming soon" placeholder so the shell renders fully
 * without us shipping feature pages in this task.
 */
export const marketingNav: NavConfig = {
  primary: [
    {
      items: [
        { to: '/', i18nKey: 'nav.marketing.home', icon: Home },
        { to: '/catalog/courses', i18nKey: 'nav.marketing.courses', icon: BookOpen },
        { to: '/catalog/learning-paths', i18nKey: 'nav.marketing.paths', icon: Compass },
        {
          i18nKey: 'nav.marketing.about',
          icon: Sparkles,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.marketing.faq',
          icon: MessageCircleQuestion,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
        {
          i18nKey: 'nav.marketing.contact',
          icon: Mail,
          disabled: true,
          badgeI18nKey: 'nav.common.soon',
        },
      ],
    },
  ],
};

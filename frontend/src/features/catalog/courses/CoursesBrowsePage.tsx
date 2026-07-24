import { useTranslation } from 'react-i18next';
import type { CatalogCategory, CatalogCourseCard } from '@/lib/api/catalog';
import { usePublicCategories, usePublicCourses } from '../api';
import { catalogErrorKey, toCatalogViewModel, type CatalogViewModel } from '../shared';
import { CoursesBrowseView } from './CoursesBrowseView';
import { useCourseCatalogFilters } from './course-catalog-filters';

const ERR = 'catalog.courses.error';

/**
 * Public courses browse page at `/catalog/courses`. Lists published, listed
 * courses with URL-bound search / category / age-band / sort filters. In dev, a
 * `?state=` query renders fixtures so every state is screenshot-able without a
 * backend; that branch is DCE'd from production via `import.meta.env.DEV`.
 */
export function CoursesBrowsePage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevCoursesBrowse devState={devState} />;
  }
  return <LiveCoursesBrowse />;
}

function activeLang(language: string): string {
  return language.startsWith('ar') ? 'ar' : 'en';
}

function LiveCoursesBrowse() {
  const { i18n } = useTranslation();
  const lang = activeLang(i18n.language);
  const fc = useCourseCatalogFilters();
  const courses = usePublicCourses({ ...fc.query, lang });
  const categories = usePublicCategories(lang);
  const vm = toCatalogViewModel<CatalogCourseCard>(
    courses,
    fc.hasActiveFilters,
    catalogErrorKey(courses.error, ERR),
  );

  return (
    <CoursesBrowseView
      fc={fc}
      vm={vm}
      categories={categories.data ?? []}
      isFetching={courses.isFetching}
      onRetry={() => void courses.refetch()}
    />
  );
}

// --- Dev-only fixtures (stripped from production) ---------------------------

const DEV_STATES = ['loading', 'error', 'empty', 'filtered-empty', 'populated'] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevCoursesBrowse({ devState }: { devState: DevState }) {
  const fc = useCourseCatalogFilters();
  return (
    <CoursesBrowseView
      fc={fc}
      vm={devViewModel(devState)}
      categories={devCategories()}
      isFetching={false}
      onRetry={() => {}}
    />
  );
}

function devViewModel(state: DevState): CatalogViewModel<CatalogCourseCard> {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: `${ERR}.body` };
    case 'empty':
      return { status: 'empty', filtered: false };
    case 'filtered-empty':
      return { status: 'empty', filtered: true };
    case 'populated':
      return { status: 'data', items: devCourses(), page: 1, totalItems: 14, totalPages: 3 };
  }
}

function devCategories(): CatalogCategory[] {
  return [
    {
      slug: 'foundations',
      name: 'Foundations',
      description: '',
      icon: null,
      order: 1,
      publishedCourseCount: 6,
    },
    {
      slug: 'web',
      name: 'Web Development',
      description: '',
      icon: null,
      order: 2,
      publishedCourseCount: 3,
    },
    {
      slug: 'game-design',
      name: 'Game Design',
      description: '',
      icon: null,
      order: 3,
      publishedCourseCount: 2,
    },
    {
      slug: 'ai',
      name: 'AI & Data',
      description: '',
      icon: null,
      order: 4,
      publishedCourseCount: 3,
    },
  ];
}

function devCourse(
  partial: Partial<CatalogCourseCard> & Pick<CatalogCourseCard, 'slug'>,
): CatalogCourseCard {
  return {
    title: null,
    subtitle: '',
    summary: '',
    ageBand: 'Junior',
    minAge: 6,
    maxAge: 9,
    deliveryType: 'Recorded',
    difficulty: 'Beginner',
    category: undefined,
    thumbnailKey: null,
    thumbnailAlt: null,
    instructors: [],
    pricing: { model: 'Free', amount: null, currency: null },
    outcomesPreview: [],
    ...partial,
  };
}

function devCourses(): CatalogCourseCard[] {
  return [
    devCourse({
      slug: 'intro-to-scratch',
      title: 'Intro to Scratch',
      summary: 'Build your first animations and games with colourful drag-and-drop blocks.',
      ageBand: 'Junior',
      minAge: 6,
      maxAge: 9,
      deliveryType: 'Recorded',
      difficulty: 'Beginner',
      category: { slug: 'foundations', name: 'Foundations' },
    }),
    devCourse({
      slug: 'python-adventures',
      title: 'Python Adventures',
      summary: 'Write real Python code through story-driven missions and mini-projects.',
      ageBand: 'Explorer',
      minAge: 10,
      maxAge: 14,
      deliveryType: 'Hybrid',
      difficulty: 'Intermediate',
      category: { slug: 'foundations', name: 'Foundations' },
      // A real storage key so this card renders a live <img> once a media host
      // is configured (VITE_MEDIA_BASE_URL); resolves to the branded fallback
      // otherwise. Backs the C4G backend-connected media evidence.
      thumbnailKey: 'courses/python/thumb.png',
      thumbnailAlt: 'Python Adventures',
    }),
    devCourse({
      slug: 'web-wizards-html-css',
      title: 'Web Wizards: HTML & CSS',
      summary: 'Design and publish your very own web pages with HTML and CSS.',
      ageBand: 'Explorer',
      minAge: 10,
      maxAge: 16,
      deliveryType: 'Recorded',
      difficulty: 'Beginner',
      category: { slug: 'web', name: 'Web Development' },
    }),
    devCourse({
      slug: 'game-design-roblox',
      title: 'Game Design with Roblox Studio',
      summary: 'Prototype, script, and share a 3D game with live-guided studio sessions.',
      ageBand: 'Explorer',
      minAge: 12,
      maxAge: 16,
      deliveryType: 'Live',
      difficulty: 'Advanced',
      category: { slug: 'game-design', name: 'Game Design' },
    }),
    devCourse({
      slug: 'ai-for-curious-kids',
      title: 'AI for Curious Kids',
      summary: 'Explore how machines learn and train your own friendly AI models.',
      ageBand: 'Explorer',
      minAge: 11,
      maxAge: 16,
      deliveryType: 'Hybrid',
      difficulty: 'Intermediate',
      category: { slug: 'ai', name: 'AI & Data' },
    }),
    devCourse({
      slug: 'robotics-basics',
      title: 'Robotics Basics',
      summary: 'Bring code to life by programming lights, motors, and sensors.',
      ageBand: 'Junior',
      minAge: 7,
      maxAge: 9,
      deliveryType: 'Live',
      difficulty: 'Beginner',
      category: { slug: 'foundations', name: 'Foundations' },
    }),
  ];
}

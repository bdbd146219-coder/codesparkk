import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CatalogCourseDetail } from '@/lib/api/catalog';
import { usePublicCourse } from '../api';
import { CourseDetailView } from './CourseDetailView';
import { toCourseDetailViewModel, type CourseDetailViewModel } from './course-detail';

/**
 * Public course detail page at `/catalog/courses/:slug` (C4B). Loads the course
 * via `usePublicCourse` (localized server-side) and renders the read-only detail
 * — hero, about/outcomes/modules sections, and a details + coming-soon-enrollment
 * sidebar. In dev, `?state=` renders fixtures so each state is screenshot-able
 * without a backend; that branch is DCE'd from production via `import.meta.env.DEV`.
 */
export function CourseDetailPage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevCourseDetail devState={devState} />;
  }
  return <LiveCourseDetail />;
}

function activeLang(language: string): string {
  return language.startsWith('ar') ? 'ar' : 'en';
}

function LiveCourseDetail() {
  const { i18n } = useTranslation();
  const lang = activeLang(i18n.language);
  const { slug } = useParams();
  const query = usePublicCourse(slug, lang);
  const vm = toCourseDetailViewModel(query);
  return <CourseDetailView vm={vm} lang={lang} onRetry={() => void query.refetch()} />;
}

// --- Dev-only fixtures (stripped from production) ---------------------------

const DEV_STATES = [
  'rich',
  'minimal',
  'noModules',
  'free',
  'paid',
  'error',
  'notfound',
  'loading',
] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevCourseDetail({ devState }: { devState: DevState }) {
  const { i18n } = useTranslation();
  return (
    <CourseDetailView
      vm={devViewModel(devState)}
      lang={activeLang(i18n.language)}
      onRetry={() => {}}
    />
  );
}

function devViewModel(state: DevState): CourseDetailViewModel {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: 'catalog.courses.detail.error.body' };
    case 'notfound':
      return { status: 'notfound' };
    case 'minimal':
      return { status: 'data', course: minimalCourse() };
    case 'noModules':
      return { status: 'data', course: { ...richCourse(), modulesPreview: [] } };
    case 'paid':
      return {
        status: 'data',
        course: { ...richCourse(), pricing: { model: 'OneTime', amount: 49, currency: 'USD' } },
      };
    case 'free':
    case 'rich':
      return { status: 'data', course: richCourse() };
  }
}

function richCourse(): CatalogCourseDetail {
  return {
    slug: 'python-adventures',
    title: 'Python Adventures',
    subtitle: 'Write real code through story-driven missions',
    summary:
      'Turn curiosity into real Python skills. Learners build games, tools, and mini-projects while mastering the fundamentals of programming.',
    description:
      'Python Adventures guides young coders from their very first line of Python to confident, project-based programming. Each mission blends story, play, and real code — variables, loops, functions, and data — so learners build genuine understanding, not just copy-paste habits.\n\nBy the end, your child will have built several small programs they can proudly show off.',
    ageBand: 'Explorer',
    minAge: 10,
    maxAge: 14,
    deliveryType: 'Hybrid',
    difficulty: 'Intermediate',
    category: { slug: 'foundations', name: 'Foundations' },
    thumbnailKey: 'courses/python/thumb.png',
    thumbnailAlt: 'Python Adventures',
    heroKey: null,
    promoVideoUrl: 'https://example.com/intro/python-adventures',
    instructors: [{ instructorUserId: '00000000-0000-0000-0000-000000000001', role: 'Lead' }],
    pricing: { model: 'Free', amount: null, currency: null },
    outcomes: [
      'Read and write Python with confidence',
      'Use variables, loops, and functions to solve problems',
      'Build small games and interactive programs',
      'Debug code and think like a programmer',
    ],
    modulesPreview: [
      {
        title: 'Getting started with Python',
        summary: 'Set up, run your first program, and meet the console.',
        order: 1,
      },
      {
        title: 'Variables & data',
        summary: 'Store and shape information — numbers, text, and lists.',
        order: 2,
      },
      {
        title: 'Loops & logic',
        summary: 'Make decisions and repeat actions to build real behaviour.',
        order: 3,
      },
      {
        title: 'Your first project',
        summary: 'Combine everything into a small game you can share.',
        order: 4,
      },
    ],
    availableLocales: ['en', 'ar'],
  };
}

function minimalCourse(): CatalogCourseDetail {
  return {
    slug: 'robotics-basics',
    title: 'Robotics Basics',
    subtitle: '',
    summary: 'Bring code to life by programming lights, motors, and sensors.',
    description: '',
    ageBand: 'Junior',
    minAge: 7,
    maxAge: 9,
    deliveryType: 'Live',
    difficulty: 'Beginner',
    category: undefined,
    thumbnailKey: null,
    thumbnailAlt: null,
    heroKey: null,
    promoVideoUrl: null,
    instructors: [],
    pricing: { model: 'Free', amount: null, currency: null },
    outcomes: [],
    modulesPreview: [],
    availableLocales: ['en'],
  };
}

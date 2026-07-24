import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CatalogCourseCard, CatalogPathDetail } from '@/lib/api/catalog';
import { usePublicLearningPath } from '../api';
import { LearningPathDetailView } from './LearningPathDetailView';
import {
  toLearningPathDetailViewModel,
  type LearningPathDetailViewModel,
} from './learning-path-detail';

/**
 * Public learning-path detail page at `/catalog/learning-paths/:slug` (C4C).
 * Loads the path via `usePublicLearningPath` (localized server-side) and renders
 * the hero + ordered course sequence (reusing `PublicCourseCard`) + a details /
 * coming-soon-access sidebar. In dev, `?state=` renders fixtures so each state is
 * screenshot-able without a backend; that branch is DCE'd from production.
 */
export function LearningPathDetailPage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevLearningPathDetail devState={devState} />;
  }
  return <LiveLearningPathDetail />;
}

function activeLang(language: string): string {
  return language.startsWith('ar') ? 'ar' : 'en';
}

function LiveLearningPathDetail() {
  const { i18n } = useTranslation();
  const lang = activeLang(i18n.language);
  const { slug } = useParams();
  const query = usePublicLearningPath(slug, lang);
  const vm = toLearningPathDetailViewModel(query);
  return <LearningPathDetailView vm={vm} onRetry={() => void query.refetch()} />;
}

// --- Dev-only fixtures (stripped from production) ---------------------------

const DEV_STATES = ['rich', 'minimal', 'emptyCourses', 'error', 'notfound', 'loading'] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevLearningPathDetail({ devState }: { devState: DevState }) {
  return <LearningPathDetailView vm={devViewModel(devState)} onRetry={() => {}} />;
}

function devViewModel(state: DevState): LearningPathDetailViewModel {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: 'catalog.learningPaths.detail.error.body' };
    case 'notfound':
      return { status: 'notfound' };
    case 'emptyCourses':
      return { status: 'data', path: { ...richPath(), courses: [] } };
    case 'minimal':
      return { status: 'data', path: minimalPath() };
    case 'rich':
      return { status: 'data', path: richPath() };
  }
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

function richPath(): CatalogPathDetail {
  return {
    slug: 'junior-coder-journey',
    title: 'Junior Coder Journey',
    summary:
      'A guided path from first blocks to first programs — one course at a time. Follow the sequence and build real confidence with every step.',
    ageBand: 'Junior',
    thumbnailKey: 'paths/junior/thumb.png',
    thumbnailAlt: 'Junior Coder Journey',
    courses: [
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
    ],
  };
}

function minimalPath(): CatalogPathDetail {
  return {
    slug: 'robotics-starter-path',
    title: 'Robotics Starter Path',
    summary: 'Combine code and hardware to make lights blink and robots move.',
    ageBand: 'Junior',
    thumbnailKey: null,
    thumbnailAlt: null,
    courses: [
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
    ],
  };
}

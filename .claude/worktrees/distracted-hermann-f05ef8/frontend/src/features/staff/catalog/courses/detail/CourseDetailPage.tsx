import { useParams } from 'react-router-dom';
import { useAdminCourse } from '@/features/staff/catalog/api';
import { CourseDetailView } from './CourseDetailView';
import type { CourseEditorDemo } from './edit/CourseEditor';
import {
  toCourseDetailViewModel,
  type AdminCourseDetail,
  type CourseDetailViewModel,
} from './detail-helpers';

/**
 * Admin course detail / editor foundation at `/staff/courses/:id` (behind
 * RequireStaff). Read-first: loads the full course via useAdminCourse and shows
 * a tabbed shell. In dev, `?state=` renders fixtures so each state is
 * screenshot-able without a backend; that branch is DCE'd from production.
 */
export function CourseDetailPage() {
  if (import.meta.env.DEV) {
    const devState = readDevDetailState();
    if (devState) return <DevCourseDetail devState={devState} />;
  }
  return <LiveCourseDetail />;
}

function LiveCourseDetail() {
  const { id } = useParams();
  const query = useAdminCourse(id);
  const vm = toCourseDetailViewModel(query);
  const reload = () => void query.refetch();
  return <CourseDetailView vm={vm} onRetry={reload} onReloadLatest={reload} />;
}

// --- Dev-only fixtures (stripped from production) ---------------------------

const DEV_STATES = [
  'loading',
  'error',
  'notfound',
  'ready',
  'unready',
  'conflict',
  'dirty',
  'invalid',
  'saving',
  // C2G — lifecycle action fixtures (open the Publishing tab via ?tab=publishing).
  'publishable',
  'archived',
  'publishConfirm',
  'unpublishConfirm',
  'archiveConfirm',
  'restoreConfirm',
  'publishBlocked',
  'lifecycleConflict',
  'publishSuccess',
  // C2H — module management fixtures (open the Modules tab via ?tab=modules).
  'modules',
  'modulesEmpty',
  'moduleAdd',
  'moduleEdit',
  'moduleRemove',
  'moduleInvalid',
  'moduleSaving',
  'moduleConflict',
  // C2I — instructor management fixtures (open the Instructors tab via ?tab=instructors).
  'instructors',
  'instructorsEmpty',
  'instructorAssign',
  'instructorRemove',
  'instructorInvalid',
  'instructorSaving',
  'instructorConflict',
] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevDetailState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevCourseDetail({ devState }: { devState: DevState }) {
  return (
    <CourseDetailView
      vm={devDetailViewModel(devState)}
      onRetry={() => {}}
      onReloadLatest={() => {}}
      demo={devDemo(devState)}
    />
  );
}

function devDemo(state: DevState): CourseEditorDemo | undefined {
  switch (state) {
    case 'conflict':
      return { conflict: true };
    case 'dirty':
      return { dirty: true };
    case 'saving':
      return { dirty: true, saving: true };
    case 'invalid':
      return { dirty: true, serverErrorKey: 'staff.catalog.courses.edit.error.validation' };
    case 'publishConfirm':
      return { lifecycle: { dialog: 'publish' } };
    case 'unpublishConfirm':
      return { lifecycle: { dialog: 'unpublish' } };
    case 'archiveConfirm':
      return { lifecycle: { dialog: 'archive' } };
    case 'restoreConfirm':
      return { lifecycle: { dialog: 'restore' } };
    case 'publishBlocked':
      return { lifecycle: { blocked: true } };
    case 'lifecycleConflict':
      return { lifecycle: { conflict: true } };
    case 'publishSuccess':
      return { lifecycle: { feedback: 'publish' } };
    case 'moduleAdd':
      return { modules: { dialog: 'add' } };
    case 'moduleEdit':
      return { modules: { dialog: 'edit' } };
    case 'moduleRemove':
      return { modules: { remove: true } };
    case 'moduleInvalid':
      return { modules: { dialog: 'add', invalid: true } };
    case 'moduleSaving':
      return { modules: { dialog: 'add', saving: true } };
    case 'moduleConflict':
      return { modules: { conflict: true } };
    case 'instructorAssign':
      return { instructors: { dialog: true } };
    case 'instructorRemove':
      return { instructors: { remove: true } };
    case 'instructorInvalid':
      return { instructors: { dialog: true, invalid: true } };
    case 'instructorSaving':
      return { instructors: { dialog: true, saving: true } };
    case 'instructorConflict':
      return { instructors: { conflict: true } };
    default:
      return undefined;
  }
}

function devDetailViewModel(state: DevState): CourseDetailViewModel {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: 'staff.catalog.courses.detail.error.body' };
    case 'notfound':
      return { status: 'notfound' };
    case 'unready':
    case 'conflict':
    case 'publishBlocked':
    case 'modulesEmpty':
    case 'instructorsEmpty':
      return { status: 'data', course: devCourse('draftUnready') };
    case 'publishable':
    case 'publishConfirm':
      return { status: 'data', course: devCourse('draftReady') };
    case 'archived':
    case 'restoreConfirm':
      return { status: 'data', course: devCourse('archived') };
    case 'ready':
    case 'dirty':
    case 'invalid':
    case 'saving':
    case 'unpublishConfirm':
    case 'archiveConfirm':
    case 'lifecycleConflict':
    case 'publishSuccess':
    case 'modules':
    case 'moduleAdd':
    case 'moduleEdit':
    case 'moduleRemove':
    case 'moduleInvalid':
    case 'moduleSaving':
    case 'moduleConflict':
    case 'instructors':
    case 'instructorAssign':
    case 'instructorRemove':
    case 'instructorInvalid':
    case 'instructorSaving':
    case 'instructorConflict':
      return { status: 'data', course: devCourse('published') };
  }
}

type DevVariant = 'published' | 'draftReady' | 'draftUnready' | 'archived';

function devCourse(variant: DevVariant): AdminCourseDetail {
  const ready = variant !== 'draftUnready';
  return {
    id: '00000000-0000-0000-0000-000000000002',
    slug: 'python-adventures',
    titleEn: 'Python Adventures',
    titleAr: 'مغامرات بايثون',
    subtitleEn: 'Build games and tools with Python',
    subtitleAr: 'اصنع الألعاب والأدوات باستخدام بايثون',
    summaryEn: 'A hands-on introduction to Python for curious explorers.',
    summaryAr: 'مقدمة عملية إلى بايثون للمستكشفين الفضوليين.',
    descriptionEn:
      'Across this course, learners build small programs, debug together, and finish with a project they are proud of.',
    descriptionAr: ready
      ? 'خلال هذه الدورة يبني المتعلمون برامج صغيرة ويصححون الأخطاء معًا وينهون بمشروع يفخرون به.'
      : null,
    deliveryType: 'Hybrid',
    difficulty: 'Intermediate',
    ageBand: 'Explorer',
    minAge: 10,
    maxAge: 14,
    publishState:
      variant === 'published' ? 'Published' : variant === 'archived' ? 'Archived' : 'Draft',
    isListed: variant === 'published',
    primaryCategoryId: 'c2',
    category: { id: 'c2', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
    pricing: { model: 'Free', amount: null, currency: null },
    media: ready
      ? {
          thumbnailKey: 'courses/python/thumb.png',
          thumbnailAlt: 'Python',
          heroKey: null,
          promoVideoUrl: null,
        }
      : { thumbnailKey: null, thumbnailAlt: null, heroKey: null, promoVideoUrl: null },
    outcomes: [
      { textEn: 'Write and run Python scripts', textAr: 'كتابة وتشغيل نصوص بايثون', order: 1 },
      {
        textEn: 'Use variables, loops, and functions',
        textAr: 'استخدام المتغيرات والحلقات والدوال',
        order: 2,
      },
      { textEn: 'Build a small game project', textAr: 'بناء مشروع لعبة صغير', order: 3 },
    ],
    modules: ready
      ? [
          {
            id: 'm1',
            titleEn: 'Getting started',
            titleAr: 'البداية',
            summaryEn: 'Setup and first script',
            summaryAr: 'الإعداد وأول نص',
            order: 1,
          },
          {
            id: 'm2',
            titleEn: 'Loops and logic',
            titleAr: 'الحلقات والمنطق',
            summaryEn: null,
            summaryAr: null,
            order: 2,
          },
          {
            id: 'm3',
            titleEn: 'Final project',
            titleAr: 'المشروع النهائي',
            summaryEn: 'Bring it together',
            summaryAr: 'اجمع كل شيء',
            order: 3,
          },
        ]
      : [],
    instructors: ready
      ? [
          { instructorUserId: '00000000-0000-0000-0000-0000000000aa', role: 'Lead' },
          { instructorUserId: '00000000-0000-0000-0000-0000000000bb', role: 'Assistant' },
        ]
      : [],
    publishReadiness: ready
      ? { isReady: true, items: [] }
      : {
          isReady: false,
          items: [
            {
              code: 'thumbnail-missing',
              messageKey: 'courses.readiness.thumbnailMissing',
              satisfied: false,
              message: 'A thumbnail is required.',
            },
            {
              code: 'lead-instructor-missing',
              messageKey: 'courses.readiness.leadInstructorMissing',
              satisfied: false,
              message: 'At least one lead instructor is required.',
            },
            {
              code: 'modules-required',
              messageKey: 'courses.readiness.modulesRequired',
              satisfied: false,
              message: 'Recorded and hybrid courses require at least one module.',
            },
          ],
        },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    publishedAt: variant === 'published' || variant === 'archived' ? '2026-02-01T10:00:00Z' : null,
    archivedAt: variant === 'archived' ? '2026-03-01T08:00:00Z' : null,
    deletedAt: null,
    rowVersion: 'AAAAAAAAB9k=',
  };
}

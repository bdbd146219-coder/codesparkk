import { useParams } from 'react-router-dom';
import { useAdminLearningPath } from '@/features/staff/catalog/api';
import { LearningPathDetailView } from './LearningPathDetailView';
import type { LearningPathEditorDemo } from './LearningPathEditor';
import {
  toDetailViewModel,
  type AdminLearningPathDetail,
  type LearningPathDetailViewModel,
} from './detail-helpers';

/**
 * Admin learning-path detail / editor at `/staff/learning-paths/:id` (behind
 * RequireStaff). Loads the full path via `useAdminLearningPath` and shows the
 * editable tabbed shell (Overview + Content editable; Items management in C3E;
 * Publishing lifecycle actions in C3F). In dev, `?state=` renders fixtures so
 * each state — including the editor's dirty/saving/conflict/validation states
 * and the lifecycle dialogs/alerts — is screenshot-able without a backend; that
 * branch is DCE'd from production via `import.meta.env.DEV`.
 */
export function LearningPathDetailPage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevLearningPathDetail devState={devState} />;
  }
  return <LiveLearningPathDetail />;
}

function LiveLearningPathDetail() {
  const { id } = useParams();
  const query = useAdminLearningPath(id);
  const vm = toDetailViewModel(query);
  const reload = () => void query.refetch();
  return <LearningPathDetailView vm={vm} onRetry={reload} onReloadLatest={reload} />;
}

// --- Dev-only fixtures (stripped from production) ---------------------------

const DEV_STATES = [
  'loading',
  'error',
  'notfound',
  'forbidden',
  'ready',
  'blocked',
  'emptyItems',
  'archived',
  // C3D — editor transient states (open Overview/Content via ?tab=).
  'dirty',
  'invalid',
  'saving',
  'conflict',
  'slugConflict',
  // C3E — items management states (open the Items tab via ?tab=items).
  'itemAdd',
  'itemInvalid',
  'itemDuplicate',
  'itemNotFound',
  'itemRemove',
  'itemConflict',
  // C3F — lifecycle actions (open the Publishing tab via ?tab=publishing).
  'publishable',
  'publishConfirm',
  'publishBlocked',
  'unpublishConfirm',
  'archiveConfirm',
  'restoreConfirm',
  'lifecycleConflict',
  'publishSuccess',
] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevLearningPathDetail({ devState }: { devState: DevState }) {
  return (
    <LearningPathDetailView
      vm={devViewModel(devState)}
      onRetry={() => {}}
      onReloadLatest={() => {}}
      demo={devDemo(devState)}
    />
  );
}

function devDemo(state: DevState): LearningPathEditorDemo | undefined {
  switch (state) {
    case 'dirty':
      return { dirty: true };
    case 'saving':
      return { dirty: true, saving: true };
    case 'conflict':
      return { conflict: true };
    case 'invalid':
      return { dirty: true, serverErrorKey: 'staff.catalog.learningPaths.edit.error.validation' };
    case 'slugConflict':
      return { dirty: true, serverErrorKey: 'staff.catalog.learningPaths.edit.error.slugTaken' };
    case 'itemAdd':
      return { items: { dialog: true } };
    case 'itemInvalid':
      return { items: { dialog: true, invalid: true } };
    case 'itemDuplicate':
      return { items: { dialog: true, duplicate: true } };
    case 'itemNotFound':
      return { items: { dialog: true, notFound: true } };
    case 'itemRemove':
      return { items: { remove: true } };
    case 'itemConflict':
      return { items: { conflict: true } };
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
    default:
      return undefined;
  }
}

function devViewModel(state: DevState): LearningPathDetailViewModel {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: 'staff.catalog.learningPaths.detail.error.body' };
    case 'notfound':
      return { status: 'notfound' };
    case 'forbidden':
      return { status: 'forbidden' };
    case 'blocked':
    case 'slugConflict':
    case 'publishBlocked':
      return { status: 'data', path: devPath('blocked') };
    case 'emptyItems':
      return { status: 'data', path: devPath('emptyItems') };
    case 'archived':
    case 'restoreConfirm':
      return { status: 'data', path: devPath('archived') };
    case 'publishable':
    case 'publishConfirm':
      return { status: 'data', path: devPath('publishable') };
    default:
      return { status: 'data', path: devPath('ready') };
  }
}

type DevVariant = 'ready' | 'blocked' | 'emptyItems' | 'archived' | 'publishable';

function devItems(): NonNullable<AdminLearningPathDetail['items']> {
  return [
    {
      id: 'i1',
      courseId: '00000000-0000-0000-0000-000000000001',
      order: 1,
      note: 'Start here — the fundamentals.',
      courseSlug: 'intro-to-scratch',
      courseTitleEn: 'Intro to Scratch',
      coursePublishState: 'Published',
    },
    {
      id: 'i2',
      courseId: '00000000-0000-0000-0000-000000000002',
      order: 2,
      note: null,
      courseSlug: 'python-adventures',
      courseTitleEn: 'Python Adventures',
      coursePublishState: 'Published',
    },
    {
      id: 'i3',
      courseId: '00000000-0000-0000-0000-000000000003',
      order: 3,
      note: null,
      courseSlug: 'web-wizards-html-css',
      courseTitleEn: 'Web Wizards: HTML & CSS',
      coursePublishState: 'Draft',
    },
  ];
}

function devPath(variant: DevVariant): AdminLearningPathDetail {
  const archived = variant === 'archived';
  const empty = variant === 'emptyItems';
  const ready = variant === 'ready';
  // A complete Draft that passes readiness — the pre-publish state (C3F).
  const publishable = variant === 'publishable';

  return {
    id: 'p1',
    slug: 'junior-coder-journey',
    titleEn: 'Junior Coder Journey',
    titleAr: 'رحلة المبرمج الصغير',
    summaryEn: 'A guided path from first blocks to first programs, one course at a time.',
    summaryAr: empty ? '' : 'مسار موجّه من أول اللبنات إلى أول البرامج، دورة تلو الأخرى.',
    ageBand: 'Junior',
    publishState: ready ? 'Published' : archived ? 'Archived' : 'Draft',
    isListed: ready,
    media: ready
      ? {
          thumbnailKey: 'paths/junior/thumb.png',
          thumbnailAlt: 'Junior Coder Journey',
          heroKey: null,
          promoVideoUrl: null,
        }
      : { thumbnailKey: null, thumbnailAlt: null, heroKey: null, promoVideoUrl: null },
    items: empty ? [] : devItems(),
    readiness:
      ready || archived || publishable
        ? { isReady: true, items: [] }
        : empty
          ? {
              isReady: false,
              items: [
                {
                  code: 'no-items',
                  messageKey: 'learningPaths.readiness.noItems',
                  satisfied: false,
                  message: 'Add at least one course to this learning path.',
                },
              ],
            }
          : {
              isReady: false,
              items: [
                {
                  code: 'no-published-course',
                  messageKey: 'learningPaths.readiness.noPublishedCourse',
                  satisfied: false,
                  message: 'Add at least one published course to this learning path.',
                },
              ],
            },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-06-21T14:30:00Z',
    publishedAt: ready || archived ? '2026-02-01T10:00:00Z' : null,
    archivedAt: archived ? '2026-03-01T08:00:00Z' : null,
    deletedAt: null,
    rowVersion: 'AAAAAAAAB9k=',
  };
}

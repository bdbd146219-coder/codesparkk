import { useAdminLearningPaths } from '@/features/staff/catalog/api';
import { LearningPathsListView } from './LearningPathsListView';
import { toViewModel, type LearningPathsViewModel, type LearningPathListItem } from './format';
import { useLearningPathFilters } from './use-learning-path-filters';

/**
 * Admin learning-paths screen at `/staff/learning-paths` (behind RequireStaff).
 * Live, it wires the URL-bound filters to `useAdminLearningPaths` and hands the
 * result to the presentational view. In dev, a `?state=` query renders fixtures
 * so every state — list, filtered, empty, error, loading — is screenshot-able
 * without a backend; that branch is DCE'd from production via `import.meta.env.DEV`.
 */
export function LearningPathsListPage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevLearningPathsList devState={devState} />;
  }
  return <LiveLearningPathsList />;
}

function LiveLearningPathsList() {
  const fc = useLearningPathFilters();
  const paths = useAdminLearningPaths(fc.query);
  const vm = toViewModel(paths, fc.hasActiveFilters);

  return (
    <LearningPathsListView
      fc={fc}
      vm={vm}
      isFetching={paths.isFetching}
      onRetry={() => void paths.refetch()}
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

function DevLearningPathsList({ devState }: { devState: DevState }) {
  const fc = useLearningPathFilters();
  return (
    <LearningPathsListView
      fc={fc}
      vm={devViewModel(devState)}
      isFetching={false}
      onRetry={() => {}}
    />
  );
}

function devViewModel(state: DevState): LearningPathsViewModel {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: 'staff.catalog.learningPaths.list.error.body' };
    case 'empty':
      return { status: 'empty', filtered: false };
    case 'filtered-empty':
      return { status: 'empty', filtered: true };
    default:
      return {
        status: 'data',
        items: devPaths(),
        page: 1,
        pageSize: 6,
        totalItems: 14,
        totalPages: 3,
      };
  }
}

// Fixtures are built inside functions (not module-level consts) so the whole dev
// branch tree-shakes out of production builds.
function devPath(
  partial: Partial<LearningPathListItem> & Pick<LearningPathListItem, 'id' | 'slug'>,
): LearningPathListItem {
  return {
    titleEn: '',
    titleAr: '',
    ageBand: 'Explorer',
    publishState: 'Draft',
    isListed: false,
    itemCount: 0,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-20T09:00:00Z',
    publishedAt: null,
    archivedAt: null,
    rowVersion: 'AAAAAAAAB9k=',
    ...partial,
  };
}

function devPaths(): LearningPathListItem[] {
  return [
    devPath({
      id: 'p1',
      slug: 'junior-coder-journey',
      titleEn: 'Junior Coder Journey',
      titleAr: 'رحلة المبرمج الصغير',
      ageBand: 'Junior',
      publishState: 'Published',
      isListed: true,
      itemCount: 6,
      publishedAt: '2026-05-01T09:00:00Z',
    }),
    devPath({
      id: 'p2',
      slug: 'web-foundations-path',
      titleEn: 'Web Foundations Path',
      titleAr: 'مسار أساسيات الويب',
      ageBand: 'Explorer',
      publishState: 'Published',
      isListed: true,
      itemCount: 5,
      publishedAt: '2026-04-12T09:00:00Z',
    }),
    devPath({
      id: 'p3',
      slug: 'game-makers-track',
      titleEn: "Game Makers' Track",
      titleAr: 'مسار صانعي الألعاب',
      ageBand: 'Explorer',
      publishState: 'InReview',
      isListed: false,
      itemCount: 4,
    }),
    devPath({
      id: 'p4',
      slug: 'ai-explorers-path',
      titleEn: 'AI Explorers Path',
      titleAr: 'مسار مستكشفي الذكاء الاصطناعي',
      ageBand: 'Explorer',
      publishState: 'Draft',
      isListed: false,
      itemCount: 3,
    }),
    devPath({
      id: 'p5',
      slug: 'robotics-starter-path',
      titleEn: 'Robotics Starter Path',
      titleAr: 'مسار مبتدئي الروبوتات',
      ageBand: 'Junior',
      publishState: 'Draft',
      isListed: false,
      itemCount: 0,
    }),
    devPath({
      id: 'p6',
      slug: 'legacy-scratch-path',
      titleEn: 'Legacy Scratch Path',
      titleAr: 'مسار سكراتش القديم',
      ageBand: 'Junior',
      publishState: 'Archived',
      isListed: false,
      itemCount: 7,
      archivedAt: '2026-03-01T09:00:00Z',
    }),
  ];
}

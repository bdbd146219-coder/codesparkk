import { useTranslation } from 'react-i18next';
import type { CatalogPathCard } from '@/lib/api/catalog';
import { usePublicLearningPaths } from '../api';
import { catalogErrorKey, toCatalogViewModel, type CatalogViewModel } from '../shared';
import { LearningPathsBrowseView } from './LearningPathsBrowseView';
import { usePathCatalogFilters } from './path-catalog-filters';

const ERR = 'catalog.learningPaths.error';

/**
 * Public learning-paths browse page at `/catalog/learning-paths`. Lists
 * published, listed learning paths with a URL-bound age-band filter. In dev, a
 * `?state=` query renders fixtures so every state is screenshot-able without a
 * backend; that branch is DCE'd from production via `import.meta.env.DEV`.
 */
export function LearningPathsBrowsePage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevPathsBrowse devState={devState} />;
  }
  return <LivePathsBrowse />;
}

function LivePathsBrowse() {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const fc = usePathCatalogFilters();
  const paths = usePublicLearningPaths({ ...fc.query, lang });
  const vm = toCatalogViewModel<CatalogPathCard>(
    paths,
    fc.hasActiveFilters,
    catalogErrorKey(paths.error, ERR),
  );

  return (
    <LearningPathsBrowseView
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

function DevPathsBrowse({ devState }: { devState: DevState }) {
  const fc = usePathCatalogFilters();
  return (
    <LearningPathsBrowseView
      fc={fc}
      vm={devViewModel(devState)}
      isFetching={false}
      onRetry={() => {}}
    />
  );
}

function devViewModel(state: DevState): CatalogViewModel<CatalogPathCard> {
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
      return { status: 'data', items: devPaths(), page: 1, totalItems: 5, totalPages: 1 };
  }
}

function devPath(
  partial: Partial<CatalogPathCard> & Pick<CatalogPathCard, 'slug'>,
): CatalogPathCard {
  return {
    title: null,
    summary: '',
    ageBand: 'Junior',
    courseCount: 0,
    thumbnailKey: null,
    thumbnailAlt: null,
    ...partial,
  };
}

function devPaths(): CatalogPathCard[] {
  return [
    devPath({
      slug: 'junior-coder-journey',
      title: 'Junior Coder Journey',
      summary: 'A guided path from first blocks to first programs, one course at a time.',
      ageBand: 'Junior',
      courseCount: 6,
      // A real storage key so this card renders a live <img> once a media host
      // is configured (VITE_MEDIA_BASE_URL); resolves to the branded fallback
      // otherwise. Backs the C4G backend-connected media evidence.
      thumbnailKey: 'paths/junior/thumb.png',
      thumbnailAlt: 'Junior Coder Journey',
    }),
    devPath({
      slug: 'web-foundations-path',
      title: 'Web Foundations Path',
      summary: 'Go from curious beginner to building and styling real web pages.',
      ageBand: 'Explorer',
      courseCount: 5,
    }),
    devPath({
      slug: 'game-makers-track',
      title: "Game Makers' Track",
      summary: 'Design, script, and publish playable games across guided courses.',
      ageBand: 'Explorer',
      courseCount: 4,
    }),
    devPath({
      slug: 'ai-explorers-path',
      title: 'AI Explorers Path',
      summary: 'Discover how AI works and build friendly, hands-on machine-learning projects.',
      ageBand: 'Explorer',
      courseCount: 3,
    }),
    devPath({
      slug: 'robotics-starter-path',
      title: 'Robotics Starter Path',
      summary: 'Combine code and hardware to make lights blink and robots move.',
      ageBand: 'Junior',
      courseCount: 4,
    }),
  ];
}

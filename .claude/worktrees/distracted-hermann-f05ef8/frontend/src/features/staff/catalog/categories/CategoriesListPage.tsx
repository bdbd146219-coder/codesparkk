import { useAdminCategories } from '@/features/staff/catalog/api';
import type { AdminCategoryDetail } from '@/lib/api/admin/categories';
import { CategoriesListView, type CategoriesViewDemo } from './CategoriesListView';
import { toViewModel, type CategoriesViewModel, type CategoryListItem } from './format';
import { useCategoryFilters } from './use-category-filters';

/**
 * Admin categories screen at `/staff/categories` (behind RequireStaff). Live,
 * it wires the URL-bound filters to `useAdminCategories` and hands the result to
 * the presentational view, which owns the create/edit/status dialogs. In dev, a
 * `?state=` query renders fixtures so every state — list, filtered, dialogs,
 * empty, error, conflict — is screenshot-able without a backend; that branch is
 * DCE'd from production via the `import.meta.env.DEV` guard.
 */
export function CategoriesListPage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevCategoriesList devState={devState} />;
  }
  return <LiveCategoriesList />;
}

function LiveCategoriesList() {
  const fc = useCategoryFilters();
  const categories = useAdminCategories(fc.query);
  const vm = toViewModel(categories, fc.hasActiveFilters);

  return (
    <CategoriesListView
      fc={fc}
      vm={vm}
      isFetching={categories.isFetching}
      onRetry={() => void categories.refetch()}
    />
  );
}

// --- Dev-only fixtures (stripped from production) ---------------------------

const DEV_STATES = [
  'loading',
  'error',
  'empty',
  'filtered-empty',
  'populated',
  'create',
  'createInvalid',
  'edit',
  'editConflict',
  'deactivate',
  'activate',
  'conflict',
  'created',
] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevCategoriesList({ devState }: { devState: DevState }) {
  const fc = useCategoryFilters();
  return (
    <CategoriesListView
      fc={fc}
      vm={devViewModel(devState)}
      isFetching={false}
      onRetry={() => {}}
      demo={devDemo(devState)}
    />
  );
}

function devViewModel(state: DevState): CategoriesViewModel {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: 'staff.catalog.categories.list.error.body' };
    case 'empty':
      return { status: 'empty', filtered: false };
    case 'filtered-empty':
      return { status: 'empty', filtered: true };
    default:
      return {
        status: 'data',
        items: devCategories(),
        page: 1,
        pageSize: 6,
        totalItems: 14,
        totalPages: 3,
      };
  }
}

function devDemo(state: DevState): CategoriesViewDemo | undefined {
  switch (state) {
    case 'create':
      return { dialog: 'create' };
    case 'createInvalid':
      return { dialog: 'createInvalid' };
    case 'edit':
      return { dialog: 'edit', editCategory: devActive(), editDetail: devDetail() };
    case 'editConflict':
      return { dialog: 'editConflict', editCategory: devActive(), editDetail: devDetail() };
    case 'deactivate':
      return { dialog: 'deactivate', editCategory: devActive() };
    case 'activate':
      return { dialog: 'activate', editCategory: devInactive() };
    case 'conflict':
      return { conflict: true };
    case 'created':
      return { feedback: 'created' };
    default:
      return undefined;
  }
}

// Fixtures are built inside functions (not module-level consts) so the whole dev
// branch tree-shakes out of production builds.
function devCategory(
  partial: Partial<CategoryListItem> & Pick<CategoryListItem, 'id' | 'slug'>,
): CategoryListItem {
  return {
    nameEn: '',
    nameAr: '',
    icon: null,
    order: 0,
    isActive: true,
    publishedCourseCount: 0,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-20T09:00:00Z',
    rowVersion: 'AAAAAAAAB9k=',
    ...partial,
  };
}

function devActive(): CategoryListItem {
  return devCategory({
    id: 'c1',
    slug: 'foundations',
    nameEn: 'Foundations',
    nameAr: 'الأساسيات',
    order: 1,
    isActive: true,
    publishedCourseCount: 12,
  });
}

function devInactive(): CategoryListItem {
  return devCategory({
    id: 'c6',
    slug: 'legacy-robotics',
    nameEn: 'Legacy Robotics',
    nameAr: 'الروبوتات القديمة',
    order: 6,
    isActive: false,
    publishedCourseCount: 0,
  });
}

function devCategories(): CategoryListItem[] {
  return [
    devActive(),
    devCategory({
      id: 'c2',
      slug: 'web-development',
      nameEn: 'Web Development',
      nameAr: 'تطوير الويب',
      order: 2,
      publishedCourseCount: 8,
    }),
    devCategory({
      id: 'c3',
      slug: 'game-design',
      nameEn: 'Game Design',
      nameAr: 'تصميم الألعاب',
      order: 3,
      publishedCourseCount: 5,
    }),
    devCategory({
      id: 'c4',
      slug: 'ai-and-data',
      nameEn: 'AI & Data',
      nameAr: 'الذكاء الاصطناعي والبيانات',
      order: 4,
      publishedCourseCount: 3,
    }),
    devCategory({
      id: 'c5',
      slug: 'robotics',
      nameEn: 'Robotics',
      nameAr: 'الروبوتات',
      order: 5,
      publishedCourseCount: 2,
    }),
    devInactive(),
  ];
}

function devDetail(): AdminCategoryDetail {
  return {
    id: 'c1',
    slug: 'foundations',
    nameEn: 'Foundations',
    nameAr: 'الأساسيات',
    descriptionEn: 'Core computing concepts every young coder starts with.',
    descriptionAr: 'المفاهيم الأساسية للحوسبة التي يبدأ بها كل مبرمج صغير.',
    icon: 'sparkles',
    order: 1,
    isActive: true,
    publishedCourseCount: 12,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-20T09:00:00Z',
    rowVersion: 'AAAAAAAAB9k=',
  };
}

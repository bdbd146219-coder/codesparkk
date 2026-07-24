import { useAdminCategories, useAdminCourses } from '@/features/staff/catalog/api';
import { CoursesListView } from './CoursesListView';
import {
  toCategoryOptions,
  toViewModel,
  type CategoryOption,
  type CourseListItem,
  type CoursesViewModel,
} from './format';
import { useCourseFilters } from './use-course-filters';

/**
 * Admin courses list screen at `/staff/courses` (behind RequireStaff). In dev,
 * a `?state=` query renders fixture data so every state — loading, error, empty,
 * filtered-empty, populated — can be screenshotted without a backend. The dev
 * branch is DCE'd from production builds via the `import.meta.env.DEV` guard.
 */
export function CoursesListPage() {
  if (import.meta.env.DEV) {
    const devState = readDevCoursesState();
    if (devState) return <DevCoursesList devState={devState} />;
  }
  return <LiveCoursesList />;
}

function LiveCoursesList() {
  const fc = useCourseFilters();
  const courses = useAdminCourses(fc.query);
  const categories = useAdminCategories();
  const vm = toViewModel(courses, fc.hasActiveFilters);

  return (
    <CoursesListView
      fc={fc}
      categoryOptions={toCategoryOptions(categories.data)}
      vm={vm}
      isFetching={courses.isFetching}
      onRetry={() => void courses.refetch()}
    />
  );
}

// --- Dev-only fixtures (stripped from production) ---------------------------

const DEV_STATES = ['loading', 'error', 'empty', 'filtered-empty', 'populated'] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevCoursesState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevCoursesList({ devState }: { devState: DevState }) {
  const fc = useCourseFilters();
  return (
    <CoursesListView
      fc={fc}
      categoryOptions={devCategories()}
      vm={devViewModel(devState)}
      isFetching={false}
      onRetry={() => {}}
    />
  );
}

function devViewModel(state: DevState): CoursesViewModel {
  switch (state) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', messageKey: 'staff.catalog.courses.list.error.body' };
    case 'empty':
      return { status: 'empty', filtered: false };
    case 'filtered-empty':
      return { status: 'empty', filtered: true };
    case 'populated':
      return {
        status: 'data',
        items: devCourses(),
        page: 1,
        pageSize: 20,
        totalItems: 42,
        totalPages: 3,
      };
  }
}

// Fixtures are built lazily inside functions (not module-level consts) so the
// whole dev branch tree-shakes out of production builds.
function devCategories(): CategoryOption[] {
  return [
    { value: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
    { value: 'web', nameEn: 'Web Development', nameAr: 'تطوير الويب' },
    { value: 'game-design', nameEn: 'Game Design', nameAr: 'تصميم الألعاب' },
    { value: 'ai', nameEn: 'AI & Data', nameAr: 'الذكاء الاصطناعي والبيانات' },
  ];
}

function devCourse(
  partial: Partial<CourseListItem> & Pick<CourseListItem, 'id' | 'slug'>,
): CourseListItem {
  return {
    titleEn: null,
    titleAr: null,
    publishState: 'Draft',
    isListed: false,
    deliveryType: 'Recorded',
    difficulty: 'Beginner',
    ageBand: 'Junior',
    minAge: 6,
    maxAge: 9,
    category: undefined,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-06-20T09:00:00Z',
    publishedAt: null,
    archivedAt: null,
    rowVersion: 'AAAAAAAAB9k=',
    ...partial,
  };
}

function devCourses(): CourseListItem[] {
  return [
    devCourse({
      id: '00000000-0000-0000-0000-000000000001',
      slug: 'intro-to-scratch',
      titleEn: 'Intro to Scratch',
      titleAr: 'مقدمة إلى سكراتش',
      publishState: 'Published',
      isListed: true,
      deliveryType: 'Recorded',
      difficulty: 'Beginner',
      ageBand: 'Junior',
      minAge: 6,
      maxAge: 9,
      category: { id: 'c1', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
    }),
    devCourse({
      id: '00000000-0000-0000-0000-000000000002',
      slug: 'python-adventures',
      titleEn: 'Python Adventures',
      titleAr: 'مغامرات بايثون',
      publishState: 'Published',
      isListed: true,
      deliveryType: 'Hybrid',
      difficulty: 'Intermediate',
      ageBand: 'Explorer',
      minAge: 10,
      maxAge: 14,
      category: { id: 'c2', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
    }),
    devCourse({
      id: '00000000-0000-0000-0000-000000000003',
      slug: 'web-wizards-html-css',
      titleEn: 'Web Wizards: HTML & CSS',
      titleAr: 'سحرة الويب: HTML و CSS',
      publishState: 'InReview',
      isListed: false,
      deliveryType: 'Recorded',
      difficulty: 'Beginner',
      ageBand: 'Explorer',
      minAge: 10,
      maxAge: 16,
      category: { id: 'c3', slug: 'web', nameEn: 'Web Development', nameAr: 'تطوير الويب' },
    }),
    devCourse({
      id: '00000000-0000-0000-0000-000000000004',
      slug: 'game-design-roblox',
      titleEn: 'Game Design with Roblox Studio',
      titleAr: 'تصميم الألعاب باستخدام Roblox',
      publishState: 'Draft',
      isListed: false,
      deliveryType: 'Live',
      difficulty: 'Advanced',
      ageBand: 'Explorer',
      minAge: 12,
      maxAge: 16,
      category: { id: 'c4', slug: 'game-design', nameEn: 'Game Design', nameAr: 'تصميم الألعاب' },
    }),
    devCourse({
      id: '00000000-0000-0000-0000-000000000005',
      slug: 'ai-for-curious-kids',
      titleEn: 'AI for Curious Kids',
      titleAr: 'الذكاء الاصطناعي للأطفال الفضوليين',
      publishState: 'Published',
      isListed: true,
      deliveryType: 'Hybrid',
      difficulty: 'Intermediate',
      ageBand: 'Explorer',
      minAge: 11,
      maxAge: 16,
      category: { id: 'c5', slug: 'ai', nameEn: 'AI & Data', nameAr: 'الذكاء الاصطناعي والبيانات' },
    }),
    devCourse({
      id: '00000000-0000-0000-0000-000000000006',
      slug: 'robotics-basics',
      titleEn: 'Robotics Basics',
      titleAr: 'أساسيات الروبوتات',
      publishState: 'Archived',
      isListed: false,
      deliveryType: 'Live',
      difficulty: 'Beginner',
      ageBand: 'Junior',
      minAge: 7,
      maxAge: 9,
      category: { id: 'c1', slug: 'foundations', nameEn: 'Foundations', nameAr: 'الأساسيات' },
    }),
  ];
}

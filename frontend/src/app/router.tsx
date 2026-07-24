import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthShell, MarketingShell, ParentShell, StaffShell, StudentShell } from '@/app/shells';
import { RequireAnonymous } from '@/app/guards/RequireAnonymous';
import { RequireAuth } from '@/app/guards/RequireAuth';
import { RequireStaff } from '@/app/guards/RequireStaff';
import { MarketingHomePage } from '@/features/marketing/MarketingHomePage';
import {
  CatalogLandingPage,
  CoursesBrowsePage,
  CourseDetailPage as PublicCourseDetailPage,
  LearningPathsBrowsePage,
  LearningPathDetailPage as PublicLearningPathDetailPage,
} from '@/features/catalog';
import { StudentHomePage } from '@/features/student/StudentHomePage';
import { StaffHomePage } from '@/features/staff/StaffHomePage';
import { CategoriesListPage } from '@/features/staff/catalog/categories';
import { LearningPathsListPage } from '@/features/staff/catalog/learning-paths';
import { InterestLeadsPage } from '@/features/staff/catalog/interests';
import { LearningPathCreatePage } from '@/features/staff/catalog/learning-paths/create';
import { LearningPathDetailPage } from '@/features/staff/catalog/learning-paths/detail';
import { CoursesListPage } from '@/features/staff/catalog/courses';
import { CourseCreatePage } from '@/features/staff/catalog/courses/create';
import { CourseDetailPage } from '@/features/staff/catalog/courses/detail';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { VerifyEmailSentPage } from '@/features/auth/pages/VerifyEmailSentPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ParentDashboardPlaceholder } from '@/features/parent/ParentDashboardPlaceholder';

// Internal QA-only pages. Lazy-loaded so they are code-split out of the main
// production bundle, and only ever registered as routes in dev/test (gated by
// `enableQaRoutes`). They must never be reachable in a production build.
const DesignSystemPage = lazy(() =>
  import('@/features/design-system/DesignSystemPage').then((m) => ({
    default: m.DesignSystemPage,
  })),
);
const SkeletonPage = lazy(() =>
  import('@/features/skeleton/SkeletonPage').then((m) => ({ default: m.SkeletonPage })),
);

export interface AppRouterProps {
  /**
   * Register the internal QA-only routes (`/design-system`, `/skeleton`).
   * Defaults to `import.meta.env.DEV`, so the routes exist in dev/test but are
   * never registered in a production build. Exposed only for testability —
   * production renders `<AppRouter />` with no props. A query parameter or
   * localStorage flag must never be able to enable these routes.
   */
  enableQaRoutes?: boolean;
}

/**
 * Route map. Each shell is a layout route — children render inside the
 * shell's <Outlet />. Auth + parent routes are wrapped by guards (which
 * also render an <Outlet />) so the URL contract matches the auth state.
 */
export function AppRouter({ enableQaRoutes = import.meta.env.DEV }: AppRouterProps = {}) {
  return (
    <Routes>
      {/* Public / marketing surface */}
      <Route element={<MarketingShell />}>
        <Route index element={<MarketingHomePage />} />

        {/* Public catalog (C4A) — browse foundation with real course (C4B) and
            learning-path (C4C) detail pages. */}
        <Route path="/catalog" element={<CatalogLandingPage />} />
        <Route path="/catalog/courses" element={<CoursesBrowsePage />} />
        <Route path="/catalog/courses/:slug" element={<PublicCourseDetailPage />} />
        <Route path="/catalog/learning-paths" element={<LearningPathsBrowsePage />} />
        <Route path="/catalog/learning-paths/:slug" element={<PublicLearningPathDetailPage />} />
      </Route>

      {/* Auth surface — anonymous-only */}
      <Route element={<RequireAnonymous />}>
        <Route element={<AuthShell />}>
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/verify-email-sent" element={<VerifyEmailSentPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* Parent surface — authenticated parents only */}
      <Route element={<RequireAuth />}>
        <Route path="/parent" element={<ParentShell />}>
          <Route index element={<ParentDashboardPlaceholder />} />
        </Route>
      </Route>

      {/* Student surface */}
      <Route path="/student" element={<StudentShell />}>
        <Route index element={<StudentHomePage />} />
      </Route>

      {/* Productivity surface (instructor / admin / super-admin). */}
      <Route path="/staff" element={<StaffShell />}>
        <Route index element={<StaffHomePage />} />

        {/* Catalog admin — staff-only (Admin / SuperAdmin). Placeholder pages
            in C2B; real screens land in later C2 tasks. */}
        <Route element={<RequireStaff />}>
          <Route path="courses" element={<CoursesListPage />} />
          <Route path="courses/new" element={<CourseCreatePage />} />
          <Route path="courses/:id" element={<CourseDetailPage />} />
          <Route path="categories" element={<CategoriesListPage />} />
          <Route path="learning-paths" element={<LearningPathsListPage />} />
          <Route path="learning-paths/new" element={<LearningPathCreatePage />} />
          <Route path="learning-paths/:id" element={<LearningPathDetailPage />} />
          <Route path="catalog/interests" element={<InterestLeadsPage />} />
        </Route>
      </Route>

      {/* Internal QA harness — dev/test only; never registered in production
          (gated by enableQaRoutes, which defaults to import.meta.env.DEV). */}
      {enableQaRoutes ? (
        <>
          <Route
            path="/design-system"
            element={
              <Suspense fallback={null}>
                <DesignSystemPage />
              </Suspense>
            }
          />
          <Route
            path="/skeleton"
            element={
              <Suspense fallback={null}>
                <SkeletonPage />
              </Suspense>
            }
          />
        </>
      ) : null}

      {/* Unknown routes return to marketing home. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthShell, MarketingShell, ParentShell, StaffShell, StudentShell } from '@/app/shells';
import { RequireAnonymous } from '@/app/guards/RequireAnonymous';
import { RequireAuth } from '@/app/guards/RequireAuth';
import { MarketingHomePage } from '@/features/marketing/MarketingHomePage';
import { StudentHomePage } from '@/features/student/StudentHomePage';
import { StaffHomePage } from '@/features/staff/StaffHomePage';
import { DesignSystemPage } from '@/features/design-system/DesignSystemPage';
import { SkeletonPage } from '@/features/skeleton/SkeletonPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';
import { VerifyEmailSentPage } from '@/features/auth/pages/VerifyEmailSentPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ParentDashboardPlaceholder } from '@/features/parent/ParentDashboardPlaceholder';

/**
 * Route map. Each shell is a layout route — children render inside the
 * shell's <Outlet />. Auth + parent routes are wrapped by guards (which
 * also render an <Outlet />) so the URL contract matches the auth state.
 */
export function AppRouter() {
  return (
    <Routes>
      {/* Public / marketing surface */}
      <Route element={<MarketingShell />}>
        <Route index element={<MarketingHomePage />} />
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
      </Route>

      {/* Internal QA harness — kept reachable for diff/QA history. */}
      <Route path="/design-system" element={<DesignSystemPage />} />
      <Route path="/skeleton" element={<SkeletonPage />} />

      {/* Unknown routes return to marketing home. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

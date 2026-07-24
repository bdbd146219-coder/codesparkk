import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '@/i18n';
import { AuthContext, type AuthContextValue } from '@/lib/auth/auth-context';
import type { AuthenticatedUser } from '@/lib/api/auth';
import { RequireStaff } from '../RequireStaff';

function authValue(partial: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'anonymous',
    user: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    login: async () => ({}) as never,
    logout: async () => {},
    refresh: async () => false,
    clear: () => {},
    ...partial,
  } as AuthContextValue;
}

function userWith(roles: string[]): AuthenticatedUser {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'staff@example.test',
    displayName: 'Test',
    roles,
    emailVerified: true,
    preferredLocale: 'en',
    timeZone: 'UTC',
    createdAt: new Date(0).toISOString(),
  } as AuthenticatedUser;
}

function renderStaffGuard(auth: AuthContextValue) {
  return render(
    <MemoryRouter initialEntries={['/staff/courses']}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/staff/courses" element={<div>PLACEHOLDER_CONTENT</div>} />
          </Route>
          <Route path="/staff" element={<div>STAFF_HOME</div>} />
          <Route path="/auth/login" element={<div>LOGIN_PAGE</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());

describe('RequireStaff', () => {
  it('shows a loading state while auth resolves', () => {
    renderStaffGuard(authValue({ status: 'loading' }));
    expect(screen.queryByRole('status')).toBeTruthy();
    expect(screen.queryByText('PLACEHOLDER_CONTENT')).toBeNull();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
  });

  it('redirects an anonymous visitor to login', () => {
    renderStaffGuard(authValue({ status: 'anonymous' }));
    expect(screen.queryByText('LOGIN_PAGE')).toBeTruthy();
    expect(screen.queryByText('PLACEHOLDER_CONTENT')).toBeNull();
  });

  it('shows Forbidden to an authenticated parent (not a redirect)', () => {
    renderStaffGuard(authValue({ status: 'authenticated', user: userWith(['Parent']) }));
    expect(screen.queryByText(/access to this area/i)).toBeTruthy();
    expect(screen.queryByText('PLACEHOLDER_CONTENT')).toBeNull();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
  });

  it('still blocks an instructor in V1', () => {
    renderStaffGuard(authValue({ status: 'authenticated', user: userWith(['Instructor']) }));
    expect(screen.queryByText(/access to this area/i)).toBeTruthy();
    expect(screen.queryByText('PLACEHOLDER_CONTENT')).toBeNull();
  });

  it('renders the route for an admin', () => {
    renderStaffGuard(authValue({ status: 'authenticated', user: userWith(['Admin']) }));
    expect(screen.queryByText('PLACEHOLDER_CONTENT')).toBeTruthy();
  });

  it('renders the route for a super-admin', () => {
    renderStaffGuard(authValue({ status: 'authenticated', user: userWith(['SuperAdmin']) }));
    expect(screen.queryByText('PLACEHOLDER_CONTENT')).toBeTruthy();
  });
});

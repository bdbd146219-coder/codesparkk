import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

/**
 * Access the auth state + actions. Must be called inside `<AuthProvider>`.
 * Kept in its own module (separate from the provider component) so Fast
 * Refresh treats the provider file as a pure-component module.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

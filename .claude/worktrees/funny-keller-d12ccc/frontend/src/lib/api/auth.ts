import type { paths } from '@/types/api';
import { api } from './client';

// Pull request / response shapes straight out of the generated OpenAPI types
// so the frontend never duplicates them. Backend changes that affect these
// surfaces become compile errors on the next `npm run gen:api-types`.
type Op<P extends keyof paths, M extends keyof paths[P]> = paths[P][M];

type RegisterReq = NonNullable<
  Op<'/api/v1/auth/parent/register', 'post'>['requestBody']
>['content']['application/json'];
type RegisterResp = Op<
  '/api/v1/auth/parent/register',
  'post'
>['responses']['202']['content']['application/json'];

type LoginReq = NonNullable<
  Op<'/api/v1/auth/login', 'post'>['requestBody']
>['content']['application/json'];
type LoginResp = Op<
  '/api/v1/auth/login',
  'post'
>['responses']['200']['content']['application/json'];

type RefreshResp = Op<
  '/api/v1/auth/refresh',
  'post'
>['responses']['200']['content']['application/json'];

type MeResp = Op<'/api/v1/auth/me', 'get'>['responses']['200']['content']['application/json'];

type ForgotReq = NonNullable<
  Op<'/api/v1/auth/forgot-password', 'post'>['requestBody']
>['content']['application/json'];
type ForgotResp = Op<
  '/api/v1/auth/forgot-password',
  'post'
>['responses']['202']['content']['application/json'];

type ResetReq = NonNullable<
  Op<'/api/v1/auth/reset-password', 'post'>['requestBody']
>['content']['application/json'];
type ResetResp = Op<
  '/api/v1/auth/reset-password',
  'post'
>['responses']['200']['content']['application/json'];

type VerifyReq = NonNullable<
  Op<'/api/v1/auth/verify-email', 'post'>['requestBody']
>['content']['application/json'];
type VerifyResp = Op<
  '/api/v1/auth/verify-email',
  'post'
>['responses']['200']['content']['application/json'];

type ResendReq = NonNullable<
  Op<'/api/v1/auth/resend-verification', 'post'>['requestBody']
>['content']['application/json'];
type ResendResp = Op<
  '/api/v1/auth/resend-verification',
  'post'
>['responses']['202']['content']['application/json'];

export type AuthenticatedUser = MeResp;
export type LoginResponse = LoginResp;
export type RefreshResponse = RefreshResp;

export const authApi = {
  register: (body: RegisterReq) =>
    api.post<RegisterResp>('/api/v1/auth/parent/register', body, { credentials: 'include' }),
  login: (body: LoginReq) =>
    api.post<LoginResp>('/api/v1/auth/login', body, { credentials: 'include' }),
  refresh: () =>
    api.post<RefreshResp>('/api/v1/auth/refresh', undefined, { credentials: 'include' }),
  logout: () => api.post<void>('/api/v1/auth/logout', undefined, { credentials: 'include' }),
  me: () => api.get<MeResp>('/api/v1/auth/me', { auth: true, credentials: 'include' }),
  forgotPassword: (body: ForgotReq) =>
    api.post<ForgotResp>('/api/v1/auth/forgot-password', body, { credentials: 'include' }),
  resetPassword: (body: ResetReq) =>
    api.post<ResetResp>('/api/v1/auth/reset-password', body, { credentials: 'include' }),
  verifyEmail: (body: VerifyReq) =>
    api.post<VerifyResp>('/api/v1/auth/verify-email', body, { credentials: 'include' }),
  resendVerification: (body: ResendReq) =>
    api.post<ResendResp>('/api/v1/auth/resend-verification', body, { credentials: 'include' }),
};

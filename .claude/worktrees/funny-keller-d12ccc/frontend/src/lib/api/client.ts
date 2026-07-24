import { ApiError } from './errors';

/**
 * Base URL of the backend API. Defaults to a localhost dev port; override
 * with `VITE_API_BASE_URL` at build time for non-dev environments.
 */
const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/**
 * Access-token accessor — set by `AuthProvider` so the client can attach
 * a bearer header without importing React. Keeping the token in memory
 * (not localStorage / sessionStorage) is a hard rule — see AGENTS.md.
 */
let getAccessToken: () => string | null = () => null;

export function setAccessTokenAccessor(fn: () => string | null): void {
  getAccessToken = fn;
}

export interface RequestOptions {
  /** Attach `Authorization: Bearer <accessToken>` from the AuthProvider. */
  auth?: boolean;
  /** Include cookies on the request (needed for the refresh cookie). */
  credentials?: 'include' | 'same-origin' | 'omit';
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

async function call<T>(
  path: string,
  init: Omit<RequestInit, 'signal'> = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: options.credentials ?? 'include',
    signal: options.signal,
  });

  if (!response.ok) {
    throw await ApiError.from(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  // The backend always sends application/json or 204; .json() is safe.
  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return call<T>(path, { method: 'GET' }, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return call<T>(
      path,
      { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) },
      options,
    );
  },
};

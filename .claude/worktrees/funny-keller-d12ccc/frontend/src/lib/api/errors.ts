/**
 * Frontend-friendly wrapper around an RFC 7807 ProblemDetails response.
 * Carries the stable `type` URI emitted by the backend so we can map it
 * to a localised message key — never render the backend's `title` directly,
 * since it contains a translation key, not user-facing copy.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    public readonly titleKey: string,
    public readonly detail?: string,
    public readonly errors?: Record<string, string[]>,
    public readonly retryAfterSeconds?: number,
  ) {
    super(titleKey);
    this.name = 'ApiError';
  }

  /** Map a ProblemDetails `type` URI to the i18n key the UI should render. */
  i18nKeyForTitle(): string {
    const t = this.type;
    if (t.endsWith('/auth/invalid-credentials')) return 'auth.errors.invalidCredentials';
    if (t.endsWith('/auth/email-not-verified')) return 'auth.errors.emailNotVerified';
    if (t.endsWith('/auth/account-locked')) return 'auth.errors.accountLocked';
    if (t.endsWith('/auth/refresh-invalid')) return 'auth.errors.refreshInvalid';
    if (t.endsWith('/auth/refresh-theft')) return 'auth.errors.refreshTheft';
    if (t.endsWith('/auth/reset-invalid')) return 'auth.errors.resetInvalid';
    if (t.endsWith('/auth/verify-invalid')) return 'auth.errors.verifyInvalid';
    if (t.endsWith('/auth/access-invalid')) return 'auth.errors.accessInvalid';
    if (t.endsWith('/validation')) return 'auth.errors.validation';
    if (this.status === 429) return 'auth.errors.rateLimited';
    if (this.status >= 500) return 'auth.errors.server';
    return 'auth.errors.generic';
  }

  /** True when the backend rejected the input shape (per-field `errors` map). */
  isValidationProblem(): boolean {
    return this.status === 400 && this.type.endsWith('/validation');
  }

  static async from(response: Response): Promise<ApiError> {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      /* non-JSON body — fall through to defaults */
    }
    const pd = (body ?? {}) as {
      type?: string;
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
    const retryHeader = response.headers.get('retry-after');
    const retryAfter = retryHeader ? Number.parseInt(retryHeader, 10) : undefined;
    return new ApiError(
      response.status,
      pd.type ?? 'about:blank',
      pd.title ?? `HTTP ${response.status}`,
      pd.detail,
      pd.errors,
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }
}

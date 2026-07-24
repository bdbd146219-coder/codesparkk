/**
 * Frontend-friendly wrapper around an RFC 7807 ProblemDetails response.
 * Carries the stable `problemType` URI emitted by the backend so we can map it
 * to a localised message key — never render the backend's `title` directly,
 * since it contains a translation key, not user-facing copy.
 *
 * Beyond the standard members it preserves every non-standard ProblemDetails
 * extension (e.g. the `currentRowVersion` echoed on a 409 concurrency conflict,
 * or the `readiness` checklist returned with a 422 publish-blocked response) so
 * callers can react to them without re-parsing the response body.
 */

/** Non-standard ProblemDetails members, keyed by name. */
export type ProblemExtensions = Record<string, unknown>;

/** Per-field validation messages, as emitted by ValidationProblemDetails. */
export type ValidationErrors = Record<string, string[]>;

/** Standard RFC 7807 members we surface as first-class fields, not extensions. */
const STANDARD_MEMBERS = new Set(['type', 'title', 'status', 'detail', 'instance', 'errors']);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problemType: string,
    public readonly titleKey: string,
    public readonly detail?: string,
    public readonly validationErrors?: ValidationErrors,
    public readonly extensions: ProblemExtensions = {},
    public readonly retryAfterSeconds?: number,
  ) {
    super(titleKey);
    this.name = 'ApiError';
  }

  /**
   * The server's current optimistic-concurrency token, echoed in the
   * `currentRowVersion` extension on a 409 conflict so the client can retry a
   * mutation with the up-to-date `rowVersion`.
   */
  get currentRowVersion(): string | undefined {
    const value = this.extensions.currentRowVersion;
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * The publish-readiness checklist returned in the `readiness` extension when
   * a 422 blocks a publish. Typed as `unknown` here because it is a transport
   * extension, not a documented response body — consumers narrow it against the
   * generated readiness DTO when they render it.
   */
  get readiness(): unknown {
    return this.extensions.readiness;
  }

  /** Map a ProblemDetails `type` URI to the i18n key the UI should render. */
  i18nKeyForTitle(): string {
    const t = this.problemType;
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
    return this.status === 400 && this.problemType.endsWith('/validation');
  }

  static async from(response: Response): Promise<ApiError> {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      /* non-JSON body — fall through to defaults */
    }
    const pd = (body ?? {}) as Record<string, unknown>;

    const problemType = typeof pd.type === 'string' ? pd.type : 'about:blank';
    const titleKey = typeof pd.title === 'string' ? pd.title : `HTTP ${response.status}`;
    const detail = typeof pd.detail === 'string' ? pd.detail : undefined;
    const validationErrors = parseValidationErrors(pd.errors);
    const extensions = collectExtensions(pd);

    const retryHeader = response.headers.get('retry-after');
    const retryAfter = retryHeader ? Number.parseInt(retryHeader, 10) : Number.NaN;

    return new ApiError(
      response.status,
      problemType,
      titleKey,
      detail,
      validationErrors,
      extensions,
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }
}

/**
 * True for an optimistic-concurrency conflict — a 409 that carries the server's
 * `currentRowVersion`. Distinguishes a stale-rowVersion conflict from other 409s
 * (e.g. a slug-already-exists conflict), so the UI can offer a reload-and-retry.
 */
export function isConcurrencyError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409 && error.currentRowVersion !== undefined;
}

/** The server's current rowVersion from a 409 conflict, if present. */
export function getCurrentRowVersion(error: unknown): string | undefined {
  return error instanceof ApiError ? error.currentRowVersion : undefined;
}

/**
 * True for a publish blocked by readiness — a 422 carrying the `readiness`
 * checklist. The UI uses this to show which requirements are unmet.
 */
export function isPublishReadinessError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 422 && error.readiness !== undefined;
}

/** The readiness checklist from a 422 publish-blocked response, if present. */
export function getReadiness(error: unknown): unknown {
  return error instanceof ApiError ? error.readiness : undefined;
}

/** Per-field validation messages from a 400 ValidationProblemDetails, if present. */
export function getValidationErrors(error: unknown): ValidationErrors | undefined {
  return error instanceof ApiError ? error.validationErrors : undefined;
}

function parseValidationErrors(raw: unknown): ValidationErrors | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const out: ValidationErrors = {};
  for (const [field, messages] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      out[field] = messages.filter((m): m is string => typeof m === 'string');
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function collectExtensions(pd: Record<string, unknown>): ProblemExtensions {
  const out: ProblemExtensions = {};
  for (const [key, value] of Object.entries(pd)) {
    if (!STANDARD_MEMBERS.has(key)) out[key] = value;
  }
  return out;
}

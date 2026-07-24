// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ApiError } from '../errors';

function problemResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json', ...headers },
  });
}

const ERRORS_ROOT = 'https://codesparkkids.dev/errors';

describe('ApiError.from', () => {
  it('maps ValidationProblemDetails into validationErrors', async () => {
    const err = await ApiError.from(
      problemResponse(400, {
        type: `${ERRORS_ROOT}/validation`,
        title: 'auth.errors.validation',
        errors: {
          email: ['Email is required.'],
          password: ['Too short.', 'Needs a symbol.'],
        },
      }),
    );

    expect(err.status).toBe(400);
    expect(err.isValidationProblem()).toBe(true);
    expect(err.validationErrors).toEqual({
      email: ['Email is required.'],
      password: ['Too short.', 'Needs a symbol.'],
    });
    expect(err.i18nKeyForTitle()).toBe('auth.errors.validation');
  });

  it('exposes currentRowVersion from a 409 conflict extension', async () => {
    const err = await ApiError.from(
      problemResponse(409, {
        type: `${ERRORS_ROOT}/catalog/course-concurrency-conflict`,
        title: 'catalog.errors.concurrencyConflict',
        currentRowVersion: 'AAAAAAAAB9k=',
      }),
    );

    expect(err.status).toBe(409);
    expect(err.currentRowVersion).toBe('AAAAAAAAB9k=');
    expect(err.extensions.currentRowVersion).toBe('AAAAAAAAB9k=');
    expect(err.validationErrors).toBeUndefined();
  });

  it('preserves the readiness extension from a 422 publish-blocked response', async () => {
    const readiness = {
      isReady: false,
      items: [
        { code: 'no-items', messageKey: 'learningPaths.readiness.noItems', satisfied: false },
        {
          code: 'no-published-course',
          messageKey: 'learningPaths.readiness.noPublishedCourse',
          satisfied: false,
        },
      ],
    };

    const err = await ApiError.from(
      problemResponse(422, {
        type: `${ERRORS_ROOT}/catalog/learning-path-publish-checklist-failed`,
        title: 'catalog.errors.publishChecklistFailed',
        readiness,
      }),
    );

    expect(err.status).toBe(422);
    expect(err.readiness).toEqual(readiness);
    expect(err.extensions.readiness).toEqual(readiness);
  });

  it('still yields useful status / type / title for a generic ProblemDetails', async () => {
    const err = await ApiError.from(
      problemResponse(500, {
        type: 'about:blank',
        title: 'auth.errors.server',
        detail: 'Unexpected failure.',
      }),
    );

    expect(err.status).toBe(500);
    expect(err.problemType).toBe('about:blank');
    expect(err.titleKey).toBe('auth.errors.server');
    expect(err.detail).toBe('Unexpected failure.');
    expect(err.validationErrors).toBeUndefined();
    expect(err.i18nKeyForTitle()).toBe('auth.errors.server');
  });

  it('parses retry-after into retryAfterSeconds and maps 429 to rate-limited', async () => {
    const err = await ApiError.from(
      problemResponse(429, { type: 'about:blank', title: 'too many' }, { 'retry-after': '30' }),
    );

    expect(err.status).toBe(429);
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.i18nKeyForTitle()).toBe('auth.errors.rateLimited');
  });

  it('falls back to defaults for a non-JSON body', async () => {
    const err = await ApiError.from(
      new Response('not json', { status: 503, headers: { 'content-type': 'text/plain' } }),
    );

    expect(err.status).toBe(503);
    expect(err.problemType).toBe('about:blank');
    expect(err.titleKey).toBe('HTTP 503');
    expect(err.extensions).toEqual({});
  });
});

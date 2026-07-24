// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ApiError,
  getCurrentRowVersion,
  getReadiness,
  getValidationErrors,
  isConcurrencyError,
  isPublishReadinessError,
} from '../errors';

const ROOT = 'https://codesparkkids.dev/errors';

const concurrency = new ApiError(
  409,
  `${ROOT}/catalog/course-concurrency-conflict`,
  'catalog.errors.concurrencyConflict',
  undefined,
  undefined,
  { currentRowVersion: 'AAAAAAAAB9k=' },
);

const slugConflict = new ApiError(
  409,
  `${ROOT}/catalog/course-slug-already-exists`,
  'catalog.errors.slugExists',
);

const readinessError = new ApiError(
  422,
  `${ROOT}/catalog/learning-path-publish-checklist-failed`,
  'catalog.errors.publishChecklistFailed',
  undefined,
  undefined,
  { readiness: { isReady: false, items: [{ code: 'no-items', satisfied: false }] } },
);

const validationError = new ApiError(
  400,
  `${ROOT}/validation`,
  'auth.errors.validation',
  undefined,
  { email: ['Email is required.'] },
);

describe('isConcurrencyError', () => {
  it('detects a 409 carrying currentRowVersion', () => {
    expect(isConcurrencyError(concurrency)).toBe(true);
  });

  it('rejects a 409 without currentRowVersion (e.g. a slug conflict)', () => {
    expect(isConcurrencyError(slugConflict)).toBe(false);
  });

  it('rejects non-409 errors and non-ApiError values', () => {
    expect(isConcurrencyError(validationError)).toBe(false);
    expect(isConcurrencyError(new Error('boom'))).toBe(false);
    expect(isConcurrencyError(null)).toBe(false);
  });
});

describe('getCurrentRowVersion', () => {
  it('returns the rowVersion from a concurrency conflict', () => {
    expect(getCurrentRowVersion(concurrency)).toBe('AAAAAAAAB9k=');
  });

  it('returns undefined when absent or not an ApiError', () => {
    expect(getCurrentRowVersion(slugConflict)).toBeUndefined();
    expect(getCurrentRowVersion(new Error('boom'))).toBeUndefined();
  });
});

describe('isPublishReadinessError', () => {
  it('detects a 422 carrying readiness', () => {
    expect(isPublishReadinessError(readinessError)).toBe(true);
  });

  it('rejects other errors', () => {
    expect(isPublishReadinessError(concurrency)).toBe(false);
    expect(isPublishReadinessError(new Error('boom'))).toBe(false);
  });
});

describe('getReadiness', () => {
  it('returns the readiness payload', () => {
    expect(getReadiness(readinessError)).toEqual({
      isReady: false,
      items: [{ code: 'no-items', satisfied: false }],
    });
  });

  it('returns undefined when absent', () => {
    expect(getReadiness(concurrency)).toBeUndefined();
    expect(getReadiness('nope')).toBeUndefined();
  });
});

describe('getValidationErrors', () => {
  it('returns the per-field messages from a validation problem', () => {
    expect(getValidationErrors(validationError)).toEqual({ email: ['Email is required.'] });
  });

  it('returns undefined for non-validation errors', () => {
    expect(getValidationErrors(concurrency)).toBeUndefined();
    expect(getValidationErrors(new Error('boom'))).toBeUndefined();
  });
});

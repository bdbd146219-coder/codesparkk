import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Locale parity guard.
 *
 * Every translation namespace must expose the *same* set of leaf keys in
 * English and Arabic. A key present in one locale but missing in the other
 * is a bug: it ships an untranslated string (i18next silently falls back to
 * the key or to English), which is exactly the kind of regression this test
 * exists to catch.
 *
 * To cover a new locale or namespace, add it to LOCALES / NAMESPACES — the
 * comparison logic is generic.
 */

const LOCALES = ['en', 'ar'] as const;
const NAMESPACES = ['common'] as const;

const here = dirname(fileURLToPath(import.meta.url));
const localesRoot = resolve(here, '..', 'locales');

type Json = Record<string, unknown>;

function loadNamespace(locale: string, namespace: string): Json {
  const file = resolve(localesRoot, locale, `${namespace}.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as Json;
}

/** Collect every leaf key path (dot-joined) from a nested translation object. */
function flattenKeys(obj: Json, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Json, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('locale parity', () => {
  for (const namespace of NAMESPACES) {
    describe(`namespace: ${namespace}`, () => {
      const keysByLocale = new Map<string, string[]>(
        LOCALES.map((locale) => [locale, flattenKeys(loadNamespace(locale, namespace))]),
      );

      // Use English as the reference; compare every other locale against it.
      const [reference, ...others] = LOCALES;
      const referenceKeys = new Set(keysByLocale.get(reference) ?? []);

      for (const locale of others) {
        const localeKeys = new Set(keysByLocale.get(locale) ?? []);

        it(`'${locale}' has no keys missing from '${reference}'`, () => {
          const missingFromReference = [...localeKeys].filter((k) => !referenceKeys.has(k));
          expect(missingFromReference, `keys in '${locale}' but not '${reference}'`).toEqual([]);
        });

        it(`'${locale}' is not missing any keys present in '${reference}'`, () => {
          const missingFromLocale = [...referenceKeys].filter((k) => !localeKeys.has(k));
          expect(missingFromLocale, `keys in '${reference}' but not '${locale}'`).toEqual([]);
        });
      }
    });
  }

  it('every namespace has a non-trivial number of keys (sanity)', () => {
    for (const namespace of NAMESPACES) {
      const count = flattenKeys(loadNamespace(LOCALES[0], namespace)).length;
      expect(count, `namespace '${namespace}' looks empty`).toBeGreaterThan(20);
    }
  });
});

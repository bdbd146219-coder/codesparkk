#!/usr/bin/env node
/**
 * Generate TypeScript types from the backend's OpenAPI schema.
 *
 *   API_SCHEMA_URL  — schema source (URL or local file path). Default:
 *                     http://localhost:5000/swagger/v1/swagger.json
 *   API_TYPES_OUT   — output file. Default: src/types/api.d.ts
 *
 * The backend must be running for URL-based generation, e.g.:
 *   dotnet run --project ../backend/src/CodeSparkKids.Api
 *
 * Then from frontend/:
 *   npm run gen:api-types
 *
 * No API client is generated — only the types. Hooks/clients are out of
 * scope until a real endpoint lands in Phase B.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const source = process.env.API_SCHEMA_URL ?? 'http://localhost:5000/swagger/v1/swagger.json';
const outputPath = resolve(
  FRONTEND_ROOT,
  process.env.API_TYPES_OUT ?? 'src/types/api.d.ts',
);

console.log(`[gen:api-types] reading schema from ${source}`);

try {
  const isUrl = /^https?:\/\//i.test(source);
  const input = isUrl ? new URL(source) : resolve(FRONTEND_ROOT, source);
  const ast = await openapiTS(input);
  const contents = astToString(ast);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `/**\n * AUTO-GENERATED FROM ${source}\n * Do not edit by hand. Run \`npm run gen:api-types\` to regenerate.\n * This file is excluded from ESLint via eslint.config.js \`ignores\`.\n */\n\n${contents}`,
    'utf8',
  );

  console.log(`[gen:api-types] wrote ${outputPath}`);
} catch (err) {
  console.error('[gen:api-types] failed to generate types.');
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  console.error('Hint: is the backend running and reachable at the schema URL?');
  process.exit(1);
}

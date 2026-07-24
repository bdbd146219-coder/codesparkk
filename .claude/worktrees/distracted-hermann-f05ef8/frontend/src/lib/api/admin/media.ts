import { api } from '../client';
import type { RequestOptions } from '../client';
import { authed } from './shared';

/**
 * Typed wrapper for the admin catalog-media upload endpoint
 * (`POST /api/v1/admin/catalog/media`, staff-only, multipart/form-data).
 *
 * Hand-typed rather than derived from the generated OpenAPI types: the request
 * is multipart (a file), not a JSON body, so the `Op<>` helper does not model
 * it. The response carries only the server-generated storage key — never a URL
 * or a disk path — which the frontend resolves to a preview via the public
 * media base (`resolveCatalogMediaUrl`).
 */

/** The catalog-media upload kinds the backend accepts. */
export type CatalogMediaKind = 'course-thumbnail' | 'course-hero' | 'learning-path-thumbnail';

export interface CatalogMediaUploadResult {
  key: string;
  contentType: string;
  sizeBytes: number;
}

const BASE = '/api/v1/admin/catalog/media';

/**
 * Upload one catalog image as staff. `context` is an optional slug used only to
 * group the generated key; the backend sanitises it and always generates a
 * unique, safe key server-side.
 */
export function uploadCatalogMedia(
  file: File,
  kind: CatalogMediaKind,
  context?: string,
  options?: RequestOptions,
): Promise<CatalogMediaUploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  if (context && context.trim()) form.append('slug', context.trim());
  return api.postForm<CatalogMediaUploadResult>(BASE, form, authed(options));
}

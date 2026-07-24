import { api } from './client';
import type { RequestOptions } from './client';

/**
 * Public pre-commerce catalog interest / lead capture
 * (`POST /api/v1/catalog/interest`, unauthenticated). Hand-typed (like the media
 * client) so a new endpoint does not require regenerating the OpenAPI types.
 *
 * This is a "contact me when enrollment opens" funnel — it grants no access,
 * creates no enrollment, and takes no payment. The response is intentionally
 * minimal (id + status + timestamp) and never echoes the submitted contact data.
 */

export type CatalogInterestSourceType = 'course' | 'learningPath';

export interface CreateCatalogInterestBody {
  sourceType: CatalogInterestSourceType;
  sourceSlug: string;
  parentName: string;
  phone: string;
  email?: string | null;
  childAge?: number | null;
  preferredLanguage?: 'en' | 'ar' | null;
  notes?: string | null;
}

export interface CatalogInterestResult {
  id: string;
  status: string;
  createdAtUtc: string;
}

const BASE = '/api/v1/catalog/interest';

/** Submit a public interest lead. No auth header is attached. */
export function submitCatalogInterest(
  body: CreateCatalogInterestBody,
  options?: RequestOptions,
): Promise<CatalogInterestResult> {
  return api.post<CatalogInterestResult>(BASE, body, options);
}

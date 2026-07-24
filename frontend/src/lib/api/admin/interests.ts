import { api } from '../client';
import type { RequestOptions } from '../client';
import { authed, toQuery } from './shared';

/**
 * Admin (staff-only) catalog interest-lead review API
 * (`/api/v1/admin/catalog/interests`). Hand-typed like the other new endpoints.
 * Read + a minimal status workflow only — no deletion, no export.
 */

export type CatalogInterestStatus = 'new' | 'contacted' | 'archived';

export interface AdminInterestLead {
  id: string;
  sourceType: 'course' | 'learningPath';
  sourceSlug: string;
  sourceTitle: string | null;
  parentName: string;
  phone: string;
  email: string | null;
  childAge: number | null;
  preferredLanguage: string | null;
  notes: string | null;
  status: CatalogInterestStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
  contactedAtUtc: string | null;
  archivedAtUtc: string | null;
  adminNotes: string | null;
}

export interface AdminInterestLeadsPage {
  items: AdminInterestLead[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminInterestListQuery {
  status?: CatalogInterestStatus;
  page?: number;
  pageSize?: number;
}

const BASE = '/api/v1/admin/catalog/interests';

export function listAdminInterestLeads(query?: AdminInterestListQuery, options?: RequestOptions) {
  const qs = query
    ? toQuery({ status: query.status, page: query.page, pageSize: query.pageSize })
    : '';
  return api.get<AdminInterestLeadsPage>(`${BASE}${qs}`, authed(options));
}

export function updateInterestStatus(
  id: string,
  status: CatalogInterestStatus,
  adminNotes?: string,
  options?: RequestOptions,
) {
  return api.patch<AdminInterestLead>(
    `${BASE}/${encodeURIComponent(id)}/status`,
    { status, adminNotes },
    authed(options),
  );
}

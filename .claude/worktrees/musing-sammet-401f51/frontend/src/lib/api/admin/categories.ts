import { api } from '../client';
import type { RequestOptions } from '../client';
import type { Op } from '../openapi';
import { authed, toQuery } from './shared';

/**
 * Typed wrappers for the admin category-management API
 * (`/api/v1/admin/categories`, staff-only). Thin functions only — request and
 * response shapes are sourced from the generated OpenAPI types.
 */

type CategoriesGet = Op<'/api/v1/admin/categories', 'get'>;
type CategoryGet = Op<'/api/v1/admin/categories/{id}', 'get'>;
type CategoryPost = Op<'/api/v1/admin/categories', 'post'>;
type CategoryPut = Op<'/api/v1/admin/categories/{id}', 'put'>;
type CategoryActivate = Op<'/api/v1/admin/categories/{id}/activate', 'post'>;

export type AdminCategoryListQuery = NonNullable<CategoriesGet['parameters']['query']>;
export type AdminCategoryListResult =
  CategoriesGet['responses']['200']['content']['application/json'];
export type AdminCategoryDetail = CategoryGet['responses']['200']['content']['application/json'];

export type CreateCategoryBody = NonNullable<
  CategoryPost['requestBody']
>['content']['application/json'];
export type CreateCategoryResult = CategoryPost['responses']['201']['content']['application/json'];
export type UpdateCategoryBody = NonNullable<
  CategoryPut['requestBody']
>['content']['application/json'];
export type CategoryLifecycleBody = NonNullable<
  CategoryActivate['requestBody']
>['content']['application/json'];

const BASE = '/api/v1/admin/categories';

export function listAdminCategories(query?: AdminCategoryListQuery, options?: RequestOptions) {
  return api.get<AdminCategoryListResult>(`${BASE}${toQuery(query)}`, authed(options));
}

export function getAdminCategory(id: string, options?: RequestOptions) {
  return api.get<AdminCategoryDetail>(`${BASE}/${id}`, authed(options));
}

export function createAdminCategory(body: CreateCategoryBody, options?: RequestOptions) {
  return api.post<CreateCategoryResult>(BASE, body, authed(options));
}

export function updateAdminCategory(
  id: string,
  body: UpdateCategoryBody,
  options?: RequestOptions,
) {
  return api.put<AdminCategoryDetail>(`${BASE}/${id}`, body, authed(options));
}

export function activateCategory(
  id: string,
  body: CategoryLifecycleBody,
  options?: RequestOptions,
) {
  return api.post<AdminCategoryDetail>(`${BASE}/${id}/activate`, body, authed(options));
}

export function deactivateCategory(
  id: string,
  body: CategoryLifecycleBody,
  options?: RequestOptions,
) {
  return api.post<AdminCategoryDetail>(`${BASE}/${id}/deactivate`, body, authed(options));
}

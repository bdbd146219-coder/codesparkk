import { api } from '../client';
import type { RequestOptions } from '../client';
import type { Op } from '../openapi';
import { authed, toQuery } from './shared';

/**
 * Typed wrappers for the admin learning-path API
 * (`/api/v1/admin/learning-paths`, staff-only). Thin functions only — request
 * and response shapes are sourced from the generated OpenAPI types.
 */

type PathsGet = Op<'/api/v1/admin/learning-paths', 'get'>;
type PathGet = Op<'/api/v1/admin/learning-paths/{id}', 'get'>;
type PathPost = Op<'/api/v1/admin/learning-paths', 'post'>;
type PathPut = Op<'/api/v1/admin/learning-paths/{id}', 'put'>;
type PathPublish = Op<'/api/v1/admin/learning-paths/{id}/publish', 'post'>;
type PathAddItem = Op<'/api/v1/admin/learning-paths/{id}/items', 'post'>;
type PathRemoveItem = Op<'/api/v1/admin/learning-paths/{id}/items/{itemId}/remove', 'post'>;
type PathReorderItems = Op<'/api/v1/admin/learning-paths/{id}/items/reorder', 'post'>;

export type AdminLearningPathListQuery = NonNullable<PathsGet['parameters']['query']>;
export type AdminLearningPathListResult =
  PathsGet['responses']['200']['content']['application/json'];
export type AdminLearningPathDetail = PathGet['responses']['200']['content']['application/json'];

export type CreateLearningPathBody = NonNullable<
  PathPost['requestBody']
>['content']['application/json'];
export type CreateLearningPathResult = PathPost['responses']['201']['content']['application/json'];
export type UpdateLearningPathBody = NonNullable<
  PathPut['requestBody']
>['content']['application/json'];

export type LearningPathLifecycleBody = NonNullable<
  PathPublish['requestBody']
>['content']['application/json'];
export type LearningPathLifecycleResult =
  PathPublish['responses']['200']['content']['application/json'];

export type AddLearningPathItemBody = NonNullable<
  PathAddItem['requestBody']
>['content']['application/json'];
export type RemoveLearningPathItemBody = NonNullable<
  PathRemoveItem['requestBody']
>['content']['application/json'];
export type ReorderLearningPathItemsBody = NonNullable<
  PathReorderItems['requestBody']
>['content']['application/json'];

const BASE = '/api/v1/admin/learning-paths';

export function listAdminLearningPaths(
  query?: AdminLearningPathListQuery,
  options?: RequestOptions,
) {
  return api.get<AdminLearningPathListResult>(`${BASE}${toQuery(query)}`, authed(options));
}

export function getAdminLearningPath(id: string, options?: RequestOptions) {
  return api.get<AdminLearningPathDetail>(`${BASE}/${id}`, authed(options));
}

export function createAdminLearningPath(body: CreateLearningPathBody, options?: RequestOptions) {
  return api.post<CreateLearningPathResult>(BASE, body, authed(options));
}

export function updateAdminLearningPath(
  id: string,
  body: UpdateLearningPathBody,
  options?: RequestOptions,
) {
  return api.put<AdminLearningPathDetail>(`${BASE}/${id}`, body, authed(options));
}

export function publishLearningPath(
  id: string,
  body: LearningPathLifecycleBody,
  options?: RequestOptions,
) {
  return api.post<LearningPathLifecycleResult>(`${BASE}/${id}/publish`, body, authed(options));
}

export function unpublishLearningPath(
  id: string,
  body: LearningPathLifecycleBody,
  options?: RequestOptions,
) {
  return api.post<LearningPathLifecycleResult>(`${BASE}/${id}/unpublish`, body, authed(options));
}

export function archiveLearningPath(
  id: string,
  body: LearningPathLifecycleBody,
  options?: RequestOptions,
) {
  return api.post<LearningPathLifecycleResult>(`${BASE}/${id}/archive`, body, authed(options));
}

export function restoreLearningPath(
  id: string,
  body: LearningPathLifecycleBody,
  options?: RequestOptions,
) {
  return api.post<LearningPathLifecycleResult>(`${BASE}/${id}/restore`, body, authed(options));
}

export function addLearningPathItem(
  id: string,
  body: AddLearningPathItemBody,
  options?: RequestOptions,
) {
  return api.post<AdminLearningPathDetail>(`${BASE}/${id}/items`, body, authed(options));
}

export function removeLearningPathItem(
  id: string,
  itemId: string,
  body: RemoveLearningPathItemBody,
  options?: RequestOptions,
) {
  return api.post<AdminLearningPathDetail>(
    `${BASE}/${id}/items/${itemId}/remove`,
    body,
    authed(options),
  );
}

export function reorderLearningPathItems(
  id: string,
  body: ReorderLearningPathItemsBody,
  options?: RequestOptions,
) {
  return api.post<AdminLearningPathDetail>(`${BASE}/${id}/items/reorder`, body, authed(options));
}

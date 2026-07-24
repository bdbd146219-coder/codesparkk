import { api } from '../client';
import type { RequestOptions } from '../client';
import type { Op } from '../openapi';
import { authed, toQuery } from './shared';

/**
 * Typed wrappers for the admin course-management API
 * (`/api/v1/admin/courses`, staff-only). Thin functions only — no React Query,
 * no UI logic. Request/response shapes come from the generated OpenAPI types so
 * a backend contract change surfaces here as a compile error.
 */

type CoursesGet = Op<'/api/v1/admin/courses', 'get'>;
type CourseGet = Op<'/api/v1/admin/courses/{id}', 'get'>;
type CoursePost = Op<'/api/v1/admin/courses', 'post'>;
type CoursePut = Op<'/api/v1/admin/courses/{id}', 'put'>;
type CoursePublish = Op<'/api/v1/admin/courses/{id}/publish', 'post'>;
type CourseAddModule = Op<'/api/v1/admin/courses/{id}/modules', 'post'>;
type CourseUpdateModule = Op<'/api/v1/admin/courses/{id}/modules/{moduleId}', 'put'>;
type CourseRemoveModule = Op<'/api/v1/admin/courses/{id}/modules/{moduleId}/remove', 'post'>;
type CourseReorderModules = Op<'/api/v1/admin/courses/{id}/modules/reorder', 'post'>;
type CourseAssignInstructor = Op<'/api/v1/admin/courses/{id}/instructors', 'post'>;
type CourseRemoveInstructor = Op<
  '/api/v1/admin/courses/{id}/instructors/{instructorUserId}/remove',
  'post'
>;

export type AdminCourseListQuery = NonNullable<CoursesGet['parameters']['query']>;
export type AdminCourseListResult = CoursesGet['responses']['200']['content']['application/json'];
export type AdminCourseDetail = CourseGet['responses']['200']['content']['application/json'];

export type CreateCourseBody = NonNullable<
  CoursePost['requestBody']
>['content']['application/json'];
export type CreateCourseResult = CoursePost['responses']['201']['content']['application/json'];
export type UpdateCourseBody = NonNullable<CoursePut['requestBody']>['content']['application/json'];

export type CourseLifecycleBody = NonNullable<
  CoursePublish['requestBody']
>['content']['application/json'];
export type CourseLifecycleResult =
  CoursePublish['responses']['200']['content']['application/json'];

export type AddCourseModuleBody = NonNullable<
  CourseAddModule['requestBody']
>['content']['application/json'];
export type UpdateCourseModuleBody = NonNullable<
  CourseUpdateModule['requestBody']
>['content']['application/json'];
export type RemoveCourseModuleBody = NonNullable<
  CourseRemoveModule['requestBody']
>['content']['application/json'];
export type ReorderCourseModulesBody = NonNullable<
  CourseReorderModules['requestBody']
>['content']['application/json'];
export type AssignCourseInstructorBody = NonNullable<
  CourseAssignInstructor['requestBody']
>['content']['application/json'];
export type RemoveCourseInstructorBody = NonNullable<
  CourseRemoveInstructor['requestBody']
>['content']['application/json'];

const BASE = '/api/v1/admin/courses';

export function listAdminCourses(query?: AdminCourseListQuery, options?: RequestOptions) {
  return api.get<AdminCourseListResult>(`${BASE}${toQuery(query)}`, authed(options));
}

export function getAdminCourse(id: string, options?: RequestOptions) {
  return api.get<AdminCourseDetail>(`${BASE}/${id}`, authed(options));
}

export function createAdminCourse(body: CreateCourseBody, options?: RequestOptions) {
  return api.post<CreateCourseResult>(BASE, body, authed(options));
}

export function updateAdminCourse(id: string, body: UpdateCourseBody, options?: RequestOptions) {
  return api.put<AdminCourseDetail>(`${BASE}/${id}`, body, authed(options));
}

export function publishCourse(id: string, body: CourseLifecycleBody, options?: RequestOptions) {
  return api.post<CourseLifecycleResult>(`${BASE}/${id}/publish`, body, authed(options));
}

export function unpublishCourse(id: string, body: CourseLifecycleBody, options?: RequestOptions) {
  return api.post<CourseLifecycleResult>(`${BASE}/${id}/unpublish`, body, authed(options));
}

export function archiveCourse(id: string, body: CourseLifecycleBody, options?: RequestOptions) {
  return api.post<CourseLifecycleResult>(`${BASE}/${id}/archive`, body, authed(options));
}

export function restoreCourse(id: string, body: CourseLifecycleBody, options?: RequestOptions) {
  return api.post<CourseLifecycleResult>(`${BASE}/${id}/restore`, body, authed(options));
}

export function addCourseModule(id: string, body: AddCourseModuleBody, options?: RequestOptions) {
  return api.post<AdminCourseDetail>(`${BASE}/${id}/modules`, body, authed(options));
}

export function updateCourseModule(
  id: string,
  moduleId: string,
  body: UpdateCourseModuleBody,
  options?: RequestOptions,
) {
  return api.put<AdminCourseDetail>(`${BASE}/${id}/modules/${moduleId}`, body, authed(options));
}

export function removeCourseModule(
  id: string,
  moduleId: string,
  body: RemoveCourseModuleBody,
  options?: RequestOptions,
) {
  return api.post<AdminCourseDetail>(
    `${BASE}/${id}/modules/${moduleId}/remove`,
    body,
    authed(options),
  );
}

export function reorderCourseModules(
  id: string,
  body: ReorderCourseModulesBody,
  options?: RequestOptions,
) {
  return api.post<AdminCourseDetail>(`${BASE}/${id}/modules/reorder`, body, authed(options));
}

export function assignCourseInstructor(
  id: string,
  body: AssignCourseInstructorBody,
  options?: RequestOptions,
) {
  return api.post<AdminCourseDetail>(`${BASE}/${id}/instructors`, body, authed(options));
}

export function removeCourseInstructor(
  id: string,
  instructorUserId: string,
  body: RemoveCourseInstructorBody,
  options?: RequestOptions,
) {
  return api.post<AdminCourseDetail>(
    `${BASE}/${id}/instructors/${instructorUserId}/remove`,
    body,
    authed(options),
  );
}

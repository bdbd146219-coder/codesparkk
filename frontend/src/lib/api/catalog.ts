import { api } from './client';
import type { RequestOptions } from './client';
import type { Op } from './openapi';
import { toQuery } from './admin/shared';

/**
 * Typed wrappers for the public catalog API (`/api/v1/catalog`, unauthenticated,
 * published-content only). Thin functions only — request and response shapes are
 * sourced from the generated OpenAPI types, so a backend change is a compile
 * error after `npm run gen:api-types`. No auth header is attached (public), and
 * responses are already localized by the backend from the `lang` query param.
 */

type CoursesGet = Op<'/api/v1/catalog/courses', 'get'>;
type CourseGet = Op<'/api/v1/catalog/courses/{slug}', 'get'>;
type CategoriesGet = Op<'/api/v1/catalog/categories', 'get'>;
type PathsGet = Op<'/api/v1/catalog/learning-paths', 'get'>;
type PathGet = Op<'/api/v1/catalog/learning-paths/{slug}', 'get'>;

export type CatalogCoursesQuery = NonNullable<CoursesGet['parameters']['query']>;
export type CatalogCoursesResult = CoursesGet['responses']['200']['content']['application/json'];
export type CatalogCourseCard = NonNullable<CatalogCoursesResult['items']>[number];
export type CatalogCourseDetail = CourseGet['responses']['200']['content']['application/json'];

export type CatalogCategory =
  CategoriesGet['responses']['200']['content']['application/json'][number];

export type CatalogPathsQuery = NonNullable<PathsGet['parameters']['query']>;
export type CatalogPathsResult = PathsGet['responses']['200']['content']['application/json'];
export type CatalogPathCard = NonNullable<CatalogPathsResult['items']>[number];
export type CatalogPathDetail = PathGet['responses']['200']['content']['application/json'];

const BASE = '/api/v1/catalog';

export function listCatalogCourses(query?: CatalogCoursesQuery, options?: RequestOptions) {
  return api.get<CatalogCoursesResult>(`${BASE}/courses${toQuery(query)}`, options);
}

export function getCatalogCourse(slug: string, lang?: string, options?: RequestOptions) {
  return api.get<CatalogCourseDetail>(
    `${BASE}/courses/${encodeURIComponent(slug)}${toQuery({ lang })}`,
    options,
  );
}

export function listCatalogCategories(lang?: string, options?: RequestOptions) {
  return api.get<CatalogCategory[]>(`${BASE}/categories${toQuery({ lang })}`, options);
}

export function listCatalogLearningPaths(query?: CatalogPathsQuery, options?: RequestOptions) {
  return api.get<CatalogPathsResult>(`${BASE}/learning-paths${toQuery(query)}`, options);
}

export function getCatalogLearningPath(slug: string, lang?: string, options?: RequestOptions) {
  return api.get<CatalogPathDetail>(
    `${BASE}/learning-paths/${encodeURIComponent(slug)}${toQuery({ lang })}`,
    options,
  );
}

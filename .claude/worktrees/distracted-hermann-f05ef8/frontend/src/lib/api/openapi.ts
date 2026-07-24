import type { paths } from '@/types/api';

/**
 * Operation type for a generated OpenAPI path + method, e.g.
 * `Op<'/api/v1/admin/courses', 'get'>`. Typed endpoint modules pull their
 * request, response, query, and path-parameter shapes straight out of this so
 * the frontend never re-declares a DTO. A backend change that alters a surface
 * becomes a compile error on the next `npm run gen:api-types`.
 */
export type Op<P extends keyof paths, M extends keyof paths[P]> = paths[P][M];

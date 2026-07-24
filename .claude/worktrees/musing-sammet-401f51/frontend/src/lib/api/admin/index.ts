/**
 * Typed admin catalog API surface. Endpoint functions only — React Query hooks
 * and UI land in later C2 tasks. Import from `@/lib/api/admin`.
 */
export * from './courses';
export * from './categories';
export * from './learning-paths';
export { toQuery } from './shared';
export type { QueryValue } from './shared';

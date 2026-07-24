/**
 * Admin catalog data layer (C2C). Query-key factory + React Query hooks that
 * wrap the typed API modules in `@/lib/api/admin`. Hooks only — screens land in
 * later C2 tasks. Import from `@/features/staff/catalog/api`.
 */
export { courseKeys, categoryKeys, learningPathKeys } from './query-keys';
export * from './use-courses';
export * from './use-categories';
export * from './use-learning-paths';

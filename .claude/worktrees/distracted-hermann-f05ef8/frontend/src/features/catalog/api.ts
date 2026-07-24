import { useQuery } from '@tanstack/react-query';
import * as catalog from '@/lib/api/catalog';

/**
 * Public catalog data layer (C4A). Read-only React Query hooks over the
 * unauthenticated `/api/v1/catalog` endpoints. Responses are already localized
 * server-side, so the active language is part of the query key (a language
 * switch refetches). No mutations — the public catalog is read-only.
 */

export const catalogKeys = {
  all: ['catalog'] as const,
  courseList: (query?: catalog.CatalogCoursesQuery) =>
    [...catalogKeys.all, 'courses', query ?? {}] as const,
  course: (slug: string | undefined, lang: string) =>
    [...catalogKeys.all, 'course', slug, lang] as const,
  categories: (lang: string) => [...catalogKeys.all, 'categories', lang] as const,
  pathList: (query?: catalog.CatalogPathsQuery) =>
    [...catalogKeys.all, 'learning-paths', query ?? {}] as const,
  path: (slug: string | undefined, lang: string) =>
    [...catalogKeys.all, 'learning-path', slug, lang] as const,
};

export function usePublicCourses(query?: catalog.CatalogCoursesQuery) {
  return useQuery({
    queryKey: catalogKeys.courseList(query),
    queryFn: ({ signal }) => catalog.listCatalogCourses(query, { signal }),
  });
}

export function usePublicCategories(lang: string) {
  return useQuery({
    queryKey: catalogKeys.categories(lang),
    queryFn: ({ signal }) => catalog.listCatalogCategories(lang, { signal }),
    staleTime: 5 * 60 * 1000, // categories change rarely
  });
}

export function usePublicLearningPaths(query?: catalog.CatalogPathsQuery) {
  return useQuery({
    queryKey: catalogKeys.pathList(query),
    queryFn: ({ signal }) => catalog.listCatalogLearningPaths(query, { signal }),
  });
}

export function usePublicCourse(slug: string | undefined, lang: string) {
  return useQuery({
    queryKey: catalogKeys.course(slug, lang),
    queryFn: ({ signal }) => catalog.getCatalogCourse(slug as string, lang, { signal }),
    enabled: Boolean(slug),
  });
}

export function usePublicLearningPath(slug: string | undefined, lang: string) {
  return useQuery({
    queryKey: catalogKeys.path(slug, lang),
    queryFn: ({ signal }) => catalog.getCatalogLearningPath(slug as string, lang, { signal }),
    enabled: Boolean(slug),
  });
}

import { describe, expect, it } from 'vitest';
import {
  filtersToQuery as courseFiltersToQuery,
  hasActiveCourseFilters,
  emptyCourseFilters,
} from '../courses/course-catalog-filters';
import { filtersToQuery as pathFiltersToQuery } from '../learning-paths/path-catalog-filters';

describe('course catalog filters → API query', () => {
  it('omits defaults (recent sort, page 1, blank fields)', () => {
    expect(courseFiltersToQuery(emptyCourseFilters)).toEqual({
      q: undefined,
      category: undefined,
      ageBand: undefined,
      sort: undefined,
      page: undefined,
    });
  });

  it('passes only the set filters, mapping the title sort and >1 page', () => {
    const query = courseFiltersToQuery({
      q: 'python',
      category: 'foundations',
      ageBand: 'Explorer',
      sort: 'title',
      page: 3,
    });
    expect(query).toEqual({
      q: 'python',
      category: 'foundations',
      ageBand: 'Explorer',
      sort: 'title',
      page: 3,
    });
  });

  it('treats q / category / ageBand as active filters but not sort or page', () => {
    expect(hasActiveCourseFilters(emptyCourseFilters)).toBe(false);
    expect(hasActiveCourseFilters({ ...emptyCourseFilters, sort: 'title', page: 2 })).toBe(false);
    expect(hasActiveCourseFilters({ ...emptyCourseFilters, q: 'x' })).toBe(true);
    expect(hasActiveCourseFilters({ ...emptyCourseFilters, category: 'web' })).toBe(true);
    expect(hasActiveCourseFilters({ ...emptyCourseFilters, ageBand: 'Junior' })).toBe(true);
  });
});

describe('learning-path catalog filters → API query', () => {
  it('exposes only ageBand + page (no search / category / sort)', () => {
    expect(pathFiltersToQuery({ ageBand: '', page: 1 })).toEqual({
      ageBand: undefined,
      page: undefined,
    });
    expect(pathFiltersToQuery({ ageBand: 'Junior', page: 2 })).toEqual({
      ageBand: 'Junior',
      page: 2,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { categoryKeys, courseKeys, learningPathKeys } from '../query-keys';

describe('courseKeys', () => {
  it('exposes a stable list prefix', () => {
    expect(courseKeys.lists()).toEqual(['admin-catalog', 'courses', 'list']);
  });

  it('list() with no filters keys off an empty object', () => {
    expect(courseKeys.list()).toEqual(['admin-catalog', 'courses', 'list', {}]);
  });

  it('list(filters) appends the filter object after the list prefix', () => {
    const filters = { page: 1, q: 'scratch' };
    const key = courseKeys.list(filters);
    expect(key.slice(0, 3)).toEqual(courseKeys.lists());
    expect(key[key.length - 1]).toEqual(filters);
  });

  it('produces equal keys for equal filters', () => {
    expect(courseKeys.list({ page: 2 })).toEqual(courseKeys.list({ page: 2 }));
  });

  it('detail includes the id and sits under the detail prefix', () => {
    expect(courseKeys.details()).toEqual(['admin-catalog', 'courses', 'detail']);
    expect(courseKeys.detail('abc')).toEqual(['admin-catalog', 'courses', 'detail', 'abc']);
  });
});

describe('categoryKeys', () => {
  it('lists and detail are correct', () => {
    expect(categoryKeys.lists()).toEqual(['admin-catalog', 'categories', 'list']);
    expect(categoryKeys.detail('cat-1')).toEqual([
      'admin-catalog',
      'categories',
      'detail',
      'cat-1',
    ]);
  });
});

describe('learningPathKeys', () => {
  it('lists and detail are correct', () => {
    expect(learningPathKeys.lists()).toEqual(['admin-catalog', 'learning-paths', 'list']);
    expect(learningPathKeys.detail('lp-1')).toEqual([
      'admin-catalog',
      'learning-paths',
      'detail',
      'lp-1',
    ]);
  });
});

describe('resource isolation', () => {
  it('keeps each resource under a distinct namespace', () => {
    expect(courseKeys.all).not.toEqual(categoryKeys.all);
    expect(categoryKeys.all).not.toEqual(learningPathKeys.all);
  });
});

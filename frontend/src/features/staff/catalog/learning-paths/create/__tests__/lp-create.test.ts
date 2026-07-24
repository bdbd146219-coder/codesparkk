import { describe, expect, it } from 'vitest';
import { createLearningPathDefaults, formToCreateBody } from '../lp-create';

describe('createLearningPathDefaults', () => {
  it('is blank-but-valid: empty title, a sensible age band, unlisted', () => {
    const d = createLearningPathDefaults();
    expect(d.titleEn).toBe('');
    expect(d.ageBand).toBe('Junior');
    expect(d.isListed).toBe(false);
    expect(d.slug).toBe('');
  });
});

describe('formToCreateBody', () => {
  it('trims the title and nulls blank optional fields; omits isListed; media is null', () => {
    const body = formToCreateBody({
      ...createLearningPathDefaults(),
      titleEn: '  Junior Coder Journey  ',
      titleAr: '',
      summaryEn: '   ',
      summaryAr: 'ملخّص',
      slug: '',
      ageBand: 'Explorer',
    });

    expect(body.titleEn).toBe('Junior Coder Journey');
    expect(body.titleAr).toBeNull();
    expect(body.summaryEn).toBeNull();
    expect(body.summaryAr).toBe('ملخّص');
    expect(body.slug).toBeNull();
    expect(body.ageBand).toBe('Explorer');
    // media and isListed are not part of the create body (added later in the editor).
    expect(body.media).toBeUndefined();
    expect('isListed' in body).toBe(false);
  });

  it('passes a provided slug through trimmed', () => {
    const body = formToCreateBody({
      ...createLearningPathDefaults(),
      titleEn: 'Path',
      slug: '  my-path  ',
    });
    expect(body.slug).toBe('my-path');
  });
});

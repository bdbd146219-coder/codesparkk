import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { MarketingHomePage } from '../MarketingHomePage';

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());

describe('MarketingHomePage', () => {
  it('routes visitors into the catalog from the hero and the explore section', () => {
    render(<MarketingHomePage />, { wrapper: Wrapper });

    // Hero CTAs
    expect(document.querySelector('a[href="/catalog"]')).toBeTruthy();
    expect(document.querySelector('a[href="/catalog/courses"]')).toBeTruthy();
    // Explore section links to both browse surfaces
    expect(document.querySelector('a[href="/catalog/learning-paths"]')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /explore our learning catalog/i })).toBeTruthy();
  });

  it('does not promote internal-only surfaces on the public homepage', () => {
    render(<MarketingHomePage />, { wrapper: Wrapper });
    // /student, /staff, and /design-system are internal/QA surfaces — the public
    // marketing homepage must not link to them (regression guard for C4D).
    for (const href of ['/student', '/staff', '/design-system']) {
      expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
    }
  });

  it('exposes no checkout / payment / enrollment links', () => {
    render(<MarketingHomePage />, { wrapper: Wrapper });
    const hrefs = Array.from(document.querySelectorAll('a')).map(
      (a) => a.getAttribute('href') ?? '',
    );
    expect(hrefs.some((h) => /checkout|payment|cart|enroll/i.test(h))).toBe(false);
  });
});

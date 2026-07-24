import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { MarketingFooter } from '../MarketingFooter';

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());

describe('MarketingFooter', () => {
  it('links the Product group to the live catalog browse pages', () => {
    render(<MarketingFooter />, { wrapper: Wrapper });
    expect(document.querySelector('a[href="/catalog/courses"]')).toBeTruthy();
    expect(document.querySelector('a[href="/catalog/learning-paths"]')).toBeTruthy();
  });

  it('renders not-yet-built entries as plain labels, not links', () => {
    render(<MarketingFooter />, { wrapper: Wrapper });
    // Legal/company pages do not exist yet, so they must not be clickable links.
    const privacy = screen.getByText('Privacy');
    expect(privacy.closest('a')).toBeNull();
  });
});

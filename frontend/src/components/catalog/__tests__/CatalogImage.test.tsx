import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import i18n from '@/i18n';
import { CatalogImage } from '../CatalogImage';

const IMG = 'https://img.example.com/cover.png';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => cleanup());

describe('CatalogImage', () => {
  it('renders the branded fallback (no <img>) when the key resolves to no URL', () => {
    const { container } = render(
      <CatalogImage mediaKey="courses/python/thumb.png" alt={null} kind="course" icon={BookOpen} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.catalog-media-fallback')).toBeTruthy();
    // Never leak the raw storage key into the DOM.
    expect(screen.queryByText('courses/python/thumb.png')).toBeNull();
  });

  it('renders the fallback for a null key', () => {
    const { container } = render(
      <CatalogImage mediaKey={null} alt={null} kind="path" icon={BookOpen} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.catalog-media-fallback')).toBeTruthy();
  });

  it('renders a real <img> with provided alt when the key is a safe absolute URL', () => {
    const { container } = render(
      <CatalogImage mediaKey={IMG} alt="Python Adventures cover" kind="course" icon={BookOpen} />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe(IMG);
    expect(img?.getAttribute('alt')).toBe('Python Adventures cover');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('falls back to a localized alt when no thumbnailAlt is provided', () => {
    const { container } = render(
      <CatalogImage mediaKey={IMG} alt={null} kind="course" icon={BookOpen} />,
    );
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('Course cover image');
  });

  it('loads the hero image eagerly', () => {
    const { container } = render(
      <CatalogImage mediaKey={IMG} alt="x" kind="path" icon={BookOpen} eager />,
    );
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });

  it('swaps to the branded fallback on image load error (no broken-image icon)', () => {
    const { container } = render(
      <CatalogImage mediaKey={IMG} alt="x" kind="course" icon={BookOpen} />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.catalog-media-fallback')).toBeTruthy();
  });

  it('recovers to a real <img> when the key changes after a load error', () => {
    const { container, rerender } = render(
      <CatalogImage mediaKey={IMG} alt="x" kind="course" icon={BookOpen} />,
    );
    // A stale/broken image falls back...
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();

    // ...but replacing the key (e.g. an admin uploads a new image) recovers.
    const NEXT = 'https://img.example.com/replacement.png';
    rerender(<CatalogImage mediaKey={NEXT} alt="x" kind="course" icon={BookOpen} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe(NEXT);
  });
});

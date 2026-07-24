import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { CatalogPagination } from '../components/CatalogPagination';

const BASE = 'catalog.courses';

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CatalogPagination', () => {
  it('renders nothing when there is a single page', () => {
    render(<CatalogPagination base={BASE} page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('disables previous on the first page and next on the last page', () => {
    const { rerender } = render(
      <CatalogPagination base={BASE} page={1} totalPages={3} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /next/i })).toHaveProperty('disabled', false);

    rerender(<CatalogPagination base={BASE} page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toHaveProperty('disabled', true);
  });

  it('emits the target page when navigating', () => {
    const onPageChange = vi.fn();
    render(<CatalogPagination base={BASE} page={2} totalPages={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });
});

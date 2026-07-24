import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CatalogPaginationProps {
  /** i18n base for the `pagination.*` keys, e.g. `catalog.courses`. */
  base: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared prev/next pager for the public browse pages. Renders nothing when there
 * is a single page. Chevrons flip under RTL; the page indicator is announced via
 * `aria-live` so screen readers hear the position change after a page switch.
 */
export function CatalogPagination({
  base,
  page,
  totalPages,
  onPageChange,
}: CatalogPaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={t(`${base}.pagination.label`)}
      className="flex items-center justify-between gap-3 pt-2"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
        {t(`${base}.pagination.previous`)}
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {t(`${base}.pagination.pageOf`, { page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t(`${base}.pagination.next`)}
        <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
      </Button>
    </nav>
  );
}

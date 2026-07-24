import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Breadcrumbs, Container, EmptyState, PageHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';

export interface CatalogCrumb {
  labelKey: string;
  to?: string;
}

export interface CatalogPlaceholderProps {
  icon: LucideIcon;
  /** Breadcrumb trail, root-first. The last item renders as the current page. */
  crumbs: ReadonlyArray<CatalogCrumb>;
  titleKey: string;
  leadKey: string;
  /** Optional already-resolved context line (e.g. a route-param echo). */
  context?: string | null;
}

/**
 * Shared chrome for the staff catalog routes prepared in C2B. Renders the
 * route's purpose using existing layout primitives — no lists, forms, or data.
 * Real screens land in later C2 tasks.
 */
export function CatalogPlaceholder({
  icon,
  crumbs,
  titleKey,
  leadKey,
  context,
}: CatalogPlaceholderProps) {
  const { t } = useTranslation();

  return (
    <Container size="xl" padded>
      <div className="space-y-8 py-6">
        <Breadcrumbs items={crumbs.map((c) => ({ label: t(c.labelKey), to: c.to }))} />
        <PageHeader
          kicker={t('staff.catalog.kicker')}
          title={t(titleKey)}
          description={t(leadKey)}
          actions={<Badge variant="secondary">{t('nav.common.soon')}</Badge>}
        />
        <EmptyState
          icon={icon}
          title={t('staff.catalog.placeholder.title')}
          description={t('staff.catalog.placeholder.body')}
        />
        {context ? (
          <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">
            {context}
          </p>
        ) : null}
      </div>
    </Container>
  );
}

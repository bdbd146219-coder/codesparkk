import { useTranslation } from 'react-i18next';
import { Container } from '@/components/layout';
import { BrandLockup } from './BrandLockup';

const FOOTER_GROUPS = [
  {
    headingKey: 'footer.groups.product',
    items: ['footer.product.courses', 'footer.product.paths', 'footer.product.practice'] as const,
  },
  {
    headingKey: 'footer.groups.company',
    items: ['footer.company.about', 'footer.company.careers', 'footer.company.contact'] as const,
  },
  {
    headingKey: 'footer.groups.legal',
    items: ['footer.legal.privacy', 'footer.legal.terms', 'footer.legal.coppa'] as const,
  },
] as const;

export function MarketingFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface/50">
      <Container size="xl" padded>
        <div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
          <div className="col-span-2 space-y-3 sm:col-span-1">
            <BrandLockup />
            <p className="text-sm text-muted-foreground">{t('footer.tagline')}</p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.headingKey}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(group.headingKey)}
              </h3>
              <ul className="space-y-2 text-sm">
                {group.items.map((key) => (
                  <li key={key}>
                    <span className="text-foreground/70">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-border py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t('footer.copyright', { year })}</span>
          <span>{t('footer.note')}</span>
        </div>
      </Container>
    </footer>
  );
}

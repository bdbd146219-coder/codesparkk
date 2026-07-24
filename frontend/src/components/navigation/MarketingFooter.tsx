import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Container } from '@/components/layout';
import { BrandLockup } from './BrandLockup';

interface FooterItem {
  key: string;
  /** Live route; when absent the item renders as a non-interactive "coming soon" label. */
  to?: string;
}

const FOOTER_GROUPS: { headingKey: string; items: FooterItem[] }[] = [
  {
    headingKey: 'footer.groups.product',
    items: [
      { key: 'footer.product.courses', to: '/catalog/courses' },
      { key: 'footer.product.paths', to: '/catalog/learning-paths' },
      { key: 'footer.product.practice' },
    ],
  },
  {
    headingKey: 'footer.groups.company',
    items: [
      { key: 'footer.company.about' },
      { key: 'footer.company.careers' },
      { key: 'footer.company.contact' },
    ],
  },
  {
    headingKey: 'footer.groups.legal',
    items: [
      { key: 'footer.legal.privacy' },
      { key: 'footer.legal.terms' },
      { key: 'footer.legal.coppa' },
    ],
  },
];

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
                {group.items.map((item) => (
                  <li key={item.key}>
                    {item.to ? (
                      <Link
                        to={item.to}
                        className="rounded-sm text-foreground/70 transition-colors duration-fast hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {t(item.key)}
                      </Link>
                    ) : (
                      <span className="text-foreground/70">{t(item.key)}</span>
                    )}
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

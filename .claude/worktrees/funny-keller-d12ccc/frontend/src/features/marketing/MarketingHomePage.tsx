import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, GraduationCap, Layers, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, PageSection } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SURFACE_LINKS = [
  { to: '/student', icon: Sparkles, key: 'student' },
  { to: '/staff', icon: Layers, key: 'staff' },
  { to: '/design-system', icon: GraduationCap, key: 'designSystem' },
] as const;

export function MarketingHomePage() {
  const { t } = useTranslation();
  return (
    <Container size="xl" padded>
      <section className="grid items-center gap-8 py-12 sm:gap-12 sm:py-20 lg:grid-cols-2">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {t('marketing.home.kicker')}
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('marketing.home.title')}
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('marketing.home.lead')}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button disabled>{t('marketing.home.ctaPrimary')}</Button>
            <Button variant="outline" disabled>
              {t('marketing.home.ctaSecondary')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('marketing.home.foundationNote')}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-md">
          <p className="text-sm font-semibold text-muted-foreground">
            {t('marketing.home.surfacesHeading')}
          </p>
          <ul className="mt-4 space-y-3">
            {SURFACE_LINKS.map(({ to, icon: Icon, key }) => (
              <li key={key}>
                <Link
                  to={to}
                  className="group flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3 text-sm transition-colors duration-fast hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="font-medium">{t(`marketing.home.surfaces.${key}`)}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-transform duration-fast group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageSection
        title={t('marketing.home.scopeHeading')}
        description={t('marketing.home.scopeDescription')}
        className="pb-16"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {(['tokens', 'shells', 'rtl'] as const).map((k) => (
            <Card key={k}>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(`marketing.home.scopeItems.${k}.title`)}
                </CardTitle>
                <CardDescription>{t(`marketing.home.scopeItems.${k}.body`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('marketing.home.foundationStatus')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageSection>
    </Container>
  );
}

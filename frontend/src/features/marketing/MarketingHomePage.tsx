import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Blocks, BookOpen, Languages, Sparkles, Users, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, PageSection } from '@/components/layout';
import { CatalogNavCard } from '@/components/catalog';

const KEY = 'marketing.home';

const HIGHLIGHTS = [
  { key: 'ages', icon: Users },
  { key: 'projects', icon: Blocks },
  { key: 'paths', icon: Waypoints },
  { key: 'bilingual', icon: Languages },
] as const;

/**
 * Public marketing homepage. The catalog is the product, so the hero routes
 * straight into it and a dedicated section promotes the two ways in (courses vs
 * learning paths). No enrollment/payment is implied — every CTA lands on public,
 * read-only catalog surfaces.
 */
export function MarketingHomePage() {
  const { t } = useTranslation();

  return (
    <Container size="xl" padded>
      <section className="grid items-center gap-8 py-12 sm:gap-12 sm:py-20 lg:grid-cols-2">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {t(`${KEY}.kicker`)}
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t(`${KEY}.title`)}
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">{t(`${KEY}.lead`)}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild>
              <Link to="/catalog">{t(`${KEY}.ctaPrimary`)}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/catalog/courses">{t(`${KEY}.ctaSecondary`)}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-md sm:p-8">
          <p className="text-sm font-semibold text-muted-foreground">
            {t(`${KEY}.highlightsHeading`)}
          </p>
          <ul className="mt-4 space-y-4">
            {HIGHLIGHTS.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {t(`${KEY}.highlights.${key}.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`${KEY}.highlights.${key}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageSection
        title={t(`${KEY}.catalog.heading`)}
        description={t(`${KEY}.catalog.lead`)}
        className="pb-16"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <CatalogNavCard
            to="/catalog/courses"
            icon={BookOpen}
            title={t(`${KEY}.catalog.courses.title`)}
            body={t(`${KEY}.catalog.courses.body`)}
            cta={t(`${KEY}.catalog.courses.cta`)}
          />
          <CatalogNavCard
            to="/catalog/learning-paths"
            icon={Waypoints}
            title={t(`${KEY}.catalog.paths.title`)}
            body={t(`${KEY}.catalog.paths.body`)}
            cta={t(`${KEY}.catalog.paths.cta`)}
          />
        </div>
        <div className="pt-6">
          <SeeAllLink to="/catalog" label={t(`${KEY}.catalog.seeAll`)} />
        </div>
      </PageSection>
    </Container>
  );
}

function SeeAllLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {label}
      <ArrowRight
        aria-hidden="true"
        className="size-4 transition-transform duration-fast group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
      />
    </Link>
  );
}

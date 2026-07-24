import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Waypoints } from 'lucide-react';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { CatalogNavCard } from '@/components/catalog';
import { CatalogHero } from './components/CatalogHero';

const KEY = 'catalog.landing';

/**
 * Public catalog landing at `/catalog`. A lightweight, static entry point — a
 * joyful hero plus two large navigation cards that route into the courses and
 * learning-paths browse pages. No data fetch, so it renders instantly and needs
 * no dev fixtures.
 */
export function CatalogLandingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-full bg-gradient-to-b from-primary/5 via-background to-background">
      <CatalogHero
        kicker={t(`${KEY}.kicker`)}
        title={t(`${KEY}.title`)}
        lead={t(`${KEY}.lead`)}
        actions={
          <>
            <Button asChild>
              <Link to="/catalog/courses">{t(`${KEY}.browseCourses`)}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/catalog/learning-paths">{t(`${KEY}.browsePaths`)}</Link>
            </Button>
          </>
        }
      />

      <Container size="lg" padded>
        <div className="grid gap-6 py-10 md:grid-cols-2">
          <CatalogNavCard
            to="/catalog/courses"
            icon={BookOpen}
            title={t(`${KEY}.courses.title`)}
            body={t(`${KEY}.courses.body`)}
            cta={t(`${KEY}.courses.cta`)}
            headingLevel={2}
          />
          <CatalogNavCard
            to="/catalog/learning-paths"
            icon={Waypoints}
            title={t(`${KEY}.paths.title`)}
            body={t(`${KEY}.paths.body`)}
            cta={t(`${KEY}.paths.cta`)}
            headingLevel={2}
          />
        </div>
      </Container>
    </div>
  );
}

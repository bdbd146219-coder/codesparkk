import { useTranslation } from 'react-i18next';
import { Compass, GraduationCap, Sparkles } from 'lucide-react';
import { Container, EmptyState, PageHeader, PageSection } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const FUTURE_TILES = [
  { key: 'learning', icon: GraduationCap },
  { key: 'practice', icon: Compass },
  { key: 'achievements', icon: Sparkles },
] as const;

export function StudentHomePage() {
  const { t } = useTranslation();
  return (
    <Container size="lg" padded>
      <div className="space-y-10 py-8 sm:py-12">
        <PageHeader
          kicker={t('student.home.kicker')}
          title={t('student.home.title')}
          description={t('student.home.lead')}
        />

        <PageSection
          title={t('student.home.upcomingHeading')}
          description={t('student.home.upcomingDescription')}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {FUTURE_TILES.map(({ key, icon: Icon }) => (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <Badge variant="secondary">{t('nav.common.soon')}</Badge>
                  </div>
                  <CardTitle className="text-base">
                    {t(`student.home.tiles.${key}.title`)}
                  </CardTitle>
                  <CardDescription>{t(`student.home.tiles.${key}.body`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('student.home.tilesPhase')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageSection>

        <PageSection
          title={t('student.home.emptyHeading')}
          description={t('student.home.emptyDescription')}
        >
          <EmptyState
            icon={Sparkles}
            title={t('student.home.empty.title')}
            description={t('student.home.empty.description')}
          />
        </PageSection>
      </div>
    </Container>
  );
}

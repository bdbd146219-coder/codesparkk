import { useTranslation } from 'react-i18next';
import { Activity, CalendarClock, ClipboardList, Users } from 'lucide-react';
import { Breadcrumbs, Container, EmptyState, PageHeader, PageSection } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STAT_TILES = [
  { key: 'activeStudents', icon: Users },
  { key: 'submissions', icon: ClipboardList },
  { key: 'liveToday', icon: CalendarClock },
  { key: 'incidents', icon: Activity },
] as const;

export function StaffHomePage() {
  const { t } = useTranslation();
  return (
    <Container size="xl" padded>
      <div className="space-y-8 py-6">
        <Breadcrumbs
          items={[{ label: t('staff.home.crumbHome') }, { label: t('staff.home.crumbOverview') }]}
        />
        <PageHeader
          kicker={t('staff.home.kicker')}
          title={t('staff.home.title')}
          description={t('staff.home.lead')}
        />

        <PageSection
          title={t('staff.home.statsHeading')}
          description={t('staff.home.statsDescription')}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_TILES.map(({ key, icon: Icon }) => (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <Badge variant="secondary">{t('staff.home.placeholder')}</Badge>
                  </div>
                  <CardTitle className="text-2xl tabular-nums">—</CardTitle>
                  <CardDescription>{t(`staff.home.stats.${key}.label`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {t(`staff.home.stats.${key}.note`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageSection>

        <PageSection
          title={t('staff.home.queueHeading')}
          description={t('staff.home.queueDescription')}
        >
          <EmptyState
            icon={ClipboardList}
            title={t('staff.home.queueEmpty.title')}
            description={t('staff.home.queueEmpty.description')}
          />
        </PageSection>
      </div>
    </Container>
  );
}

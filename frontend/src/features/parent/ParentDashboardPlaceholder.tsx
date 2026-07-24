import { useTranslation } from 'react-i18next';
import {
  BellRing,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Container, EmptyState, PageHeader, PageSection } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/use-auth';

const TILES = [
  { key: 'children', icon: Users },
  { key: 'progress', icon: TrendingUp },
  { key: 'attendance', icon: CalendarClock },
  { key: 'payments', icon: CreditCard },
  { key: 'reports', icon: ClipboardList },
  { key: 'notifications', icon: BellRing },
] as const;

export function ParentDashboardPlaceholder() {
  const { t } = useTranslation();
  const auth = useAuth();

  return (
    <Container size="xl" padded>
      <div className="space-y-8 py-8">
        <PageHeader
          kicker={t('parent.home.kicker')}
          title={t('parent.home.title', {
            name: auth.user?.displayName || t('parent.home.fallbackName'),
          })}
          description={t('parent.home.lead')}
          actions={
            <Button variant="ghost" size="sm" onClick={() => void auth.logout()}>
              {t('parent.home.logout')}
            </Button>
          }
        />

        <PageSection
          title={t('parent.home.upcomingHeading')}
          description={t('parent.home.upcomingDescription')}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TILES.map(({ key, icon: Icon }) => (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <Badge variant="secondary">{t('nav.common.soon')}</Badge>
                  </div>
                  <CardTitle className="text-base">{t(`parent.home.tiles.${key}.title`)}</CardTitle>
                  <CardDescription>{t(`parent.home.tiles.${key}.body`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t('parent.home.tilesPhase')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageSection>

        <PageSection
          title={t('parent.home.todayHeading')}
          description={t('parent.home.todayDescription')}
        >
          <EmptyState
            icon={Sparkles}
            title={t('parent.home.empty.title')}
            description={t('parent.home.empty.description')}
          />
        </PageSection>
      </div>
    </Container>
  );
}

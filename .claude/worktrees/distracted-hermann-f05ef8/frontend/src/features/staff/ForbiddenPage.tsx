import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldX } from 'lucide-react';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/use-auth';

/**
 * 403 surface for staff routes a signed-in user may not access. Rendered by the
 * role guards *inside* StaffShell, so the sidebar/top bar stay put and the user
 * can navigate away. Professional tone — this is an operator screen, not a
 * child-facing one.
 */
export function ForbiddenPage() {
  const { t } = useTranslation();
  const auth = useAuth();

  return (
    <Container size="md" padded>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-12 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX aria-hidden="true" className="size-7" />
        </span>
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t('staff.forbidden.kicker')}
          </p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {t('staff.forbidden.title')}
          </h1>
          <p className="mx-auto max-w-prose text-muted-foreground">{t('staff.forbidden.lead')}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/staff">{t('staff.forbidden.backHome')}</Link>
          </Button>
          {auth.status === 'authenticated' ? (
            <Button variant="outline" onClick={() => void auth.logout()}>
              {t('staff.forbidden.logout')}
            </Button>
          ) : null}
        </div>
      </div>
    </Container>
  );
}

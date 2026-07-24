import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox, Mail, Phone } from 'lucide-react';
import { Breadcrumbs, Container, EmptyState, PageHeader, PageSection } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { CatalogInterestStatus, AdminInterestLead } from '@/lib/api/admin/interests';
import { useAdminInterestLeads, useUpdateInterestStatus } from './use-interest-leads';

const KEY = 'staff.catalog.interests';

const FILTERS: { value: CatalogInterestStatus | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: `${KEY}.filters.all` },
  { value: 'new', labelKey: `${KEY}.filters.new` },
  { value: 'contacted', labelKey: `${KEY}.filters.contacted` },
  { value: 'archived', labelKey: `${KEY}.filters.archived` },
];

/**
 * Minimal staff review of pre-commerce interest leads (Admin/SuperAdmin). List
 * + status filter + a two-step workflow (Mark contacted / Archive). No deletion,
 * no export, no bulk actions — a lightweight follow-up queue, not a CRM.
 */
export function InterestLeadsPage() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<CatalogInterestStatus | 'all'>('all');

  const query = filter === 'all' ? undefined : { status: filter };
  const leadsQuery = useAdminInterestLeads(query);
  const updateStatus = useUpdateInterestStatus();

  const leads = leadsQuery.data?.items ?? [];

  return (
    <Container size="xl" padded>
      <div className="space-y-8 py-6">
        <Breadcrumbs items={[{ label: t('staff.home.crumbHome') }, { label: t(`${KEY}.title`) }]} />
        <PageHeader
          kicker={t(`${KEY}.kicker`)}
          title={t(`${KEY}.title`)}
          description={t(`${KEY}.lead`)}
        />

        <PageSection title={t(`${KEY}.listHeading`)} description={t(`${KEY}.listDescription`)}>
          <div
            className="mb-4 flex flex-wrap gap-2"
            role="group"
            aria-label={t(`${KEY}.filters.label`)}
          >
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={filter === f.value ? 'primary' : 'outline'}
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
              >
                {t(f.labelKey)}
              </Button>
            ))}
          </div>

          {leadsQuery.isLoading ? (
            <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
              <span className="sr-only">{t(`${KEY}.loading`)}</span>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : leadsQuery.isError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {t(`${KEY}.error`)}
            </p>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t(`${KEY}.empty.title`)}
              description={t(`${KEY}.empty.description`)}
            />
          ) : (
            <ul className="space-y-3">
              {leads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  lang={i18n.language}
                  busy={updateStatus.isPending}
                  onSetStatus={(status) => updateStatus.mutate({ id: lead.id, status })}
                />
              ))}
            </ul>
          )}
        </PageSection>
      </div>
    </Container>
  );
}

function LeadRow({
  lead,
  lang,
  busy,
  onSetStatus,
}: {
  lead: AdminInterestLead;
  lang: string;
  busy: boolean;
  onSetStatus: (status: CatalogInterestStatus) => void;
}) {
  const { t } = useTranslation();
  const submitted = new Date(lead.createdAtUtc).toLocaleString(lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{t(`${KEY}.sourceType.${lead.sourceType}`)}</Badge>
              <span className="font-medium text-foreground" dir="auto">
                {lead.sourceTitle ?? lead.sourceSlug}
              </span>
              <StatusBadge status={lead.status} />
            </div>
            <p className="font-medium text-foreground" dir="auto">
              {lead.parentName}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5" dir="ltr">
                <Phone aria-hidden="true" className="size-3.5" />
                {lead.phone}
              </span>
              {lead.email ? (
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Mail aria-hidden="true" className="size-3.5" />
                  {lead.email}
                </span>
              ) : null}
              {lead.childAge != null ? (
                <span>{t(`${KEY}.childAge`, { age: lead.childAge })}</span>
              ) : null}
            </div>
            {lead.notes ? (
              <p className="text-sm text-muted-foreground" dir="auto">
                “{lead.notes}”
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t(`${KEY}.submitted`, { when: submitted })}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {lead.status !== 'contacted' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onSetStatus('contacted')}
              >
                {t(`${KEY}.actions.markContacted`)}
              </Button>
            ) : null}
            {lead.status !== 'archived' ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onSetStatus('archived')}
              >
                {t(`${KEY}.actions.archive`)}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onSetStatus('new')}
              >
                {t(`${KEY}.actions.reopen`)}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function StatusBadge({ status }: { status: CatalogInterestStatus }) {
  const { t } = useTranslation();
  const variant = status === 'new' ? 'default' : status === 'contacted' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{t(`${KEY}.status.${status}`)}</Badge>;
}

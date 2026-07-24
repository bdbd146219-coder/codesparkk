import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Inbox, Mail, Phone, StickyNote } from 'lucide-react';
import { Breadcrumbs, Container, EmptyState, PageHeader, PageSection } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CatalogPagination } from '@/features/catalog/components/CatalogPagination';
import type { AdminInterestLead, CatalogInterestStatus } from '@/lib/api/admin/interests';
import { buildCsv, downloadCsv, interestLeadsFileName } from './interest-export';
import { useAdminInterestLeads, useUpdateInterestStatus } from './use-interest-leads';

const KEY = 'staff.catalog.interests';

type StatusFilter = CatalogInterestStatus | 'all';
type LeadsViewState = 'loading' | 'error' | 'empty' | 'data';

const STATUS_FILTERS: StatusFilter[] = ['all', 'new', 'contacted', 'archived'];

/**
 * Admin review of pre-commerce interest leads (Admin/SuperAdmin). URL-bound
 * status filter + pagination, a per-lead follow-up workflow (mark contacted /
 * archive / reopen) with an editable staff-only note, and a safe CSV export of
 * the current filtered page. Still a lightweight follow-up queue — no deletion,
 * no bulk server export, no CRM. Dev `?state=` fixtures make every state
 * screenshot-able without a backend; that branch is DCE'd from production.
 */
export function InterestLeadsPage() {
  if (import.meta.env.DEV) {
    const devState = readDevState();
    if (devState) return <DevInterestLeads devState={devState} />;
  }
  return <LiveInterestLeads />;
}

function LiveInterestLeads() {
  const { status, page, setStatus, setPage } = useInterestUrlState();

  const leadsQuery = useAdminInterestLeads({
    status: status === 'all' ? undefined : status,
    page,
  });
  const updateStatus = useUpdateInterestStatus();

  const data = leadsQuery.data;
  const leads = data?.items ?? [];
  const viewState: LeadsViewState = leadsQuery.isLoading
    ? 'loading'
    : leadsQuery.isError
      ? 'error'
      : leads.length === 0
        ? 'empty'
        : 'data';

  return (
    <InterestLeadsView
      status={status}
      onStatusChange={setStatus}
      page={data?.page ?? page}
      totalPages={data?.totalPages ?? 0}
      onPageChange={setPage}
      viewState={viewState}
      leads={leads}
      busy={updateStatus.isPending}
      onSetStatus={(id, next, adminNotes) => updateStatus.mutate({ id, status: next, adminNotes })}
    />
  );
}

interface InterestLeadsViewProps {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  viewState: LeadsViewState;
  leads: AdminInterestLead[];
  busy: boolean;
  onSetStatus: (id: string, status: CatalogInterestStatus, adminNotes?: string) => void;
}

/** Presentational list — all data + callbacks come in via props, so it is fully
 * testable and reusable by the dev-fixture branch. */
export function InterestLeadsView({
  status,
  onStatusChange,
  page,
  totalPages,
  onPageChange,
  viewState,
  leads,
  busy,
  onSetStatus,
}: InterestLeadsViewProps) {
  const { t, i18n } = useTranslation();

  const handleExport = () => {
    const header = [
      t(`${KEY}.export.columns.submitted`),
      t(`${KEY}.export.columns.sourceType`),
      t(`${KEY}.export.columns.source`),
      t(`${KEY}.export.columns.parentName`),
      t(`${KEY}.export.columns.phone`),
      t(`${KEY}.export.columns.email`),
      t(`${KEY}.export.columns.childAge`),
      t(`${KEY}.export.columns.language`),
      t(`${KEY}.export.columns.notes`),
      t(`${KEY}.export.columns.status`),
      t(`${KEY}.export.columns.adminNotes`),
    ];
    const rows = leads.map((lead) => [
      lead.createdAtUtc,
      t(`${KEY}.sourceType.${lead.sourceType}`),
      lead.sourceTitle ?? lead.sourceSlug,
      lead.parentName,
      lead.phone,
      lead.email ?? '',
      lead.childAge != null ? String(lead.childAge) : '',
      lead.preferredLanguage ?? '',
      lead.notes ?? '',
      t(`${KEY}.status.${lead.status}`),
      lead.adminNotes ?? '',
    ]);
    downloadCsv(interestLeadsFileName(status), buildCsv(header, rows));
  };

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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t(`${KEY}.filters.label`)}
            >
              {STATUS_FILTERS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={status === value ? 'primary' : 'outline'}
                  aria-pressed={status === value}
                  onClick={() => onStatusChange(value)}
                >
                  {t(`${KEY}.filters.${value}`)}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ms-auto"
              disabled={viewState !== 'data'}
              title={t(`${KEY}.export.hint`)}
              onClick={handleExport}
            >
              <Download aria-hidden="true" className="size-4" />
              {t(`${KEY}.export.button`)}
            </Button>
          </div>

          {viewState === 'loading' ? (
            <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
              <span className="sr-only">{t(`${KEY}.loading`)}</span>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : viewState === 'error' ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {t(`${KEY}.error`)}
            </p>
          ) : viewState === 'empty' ? (
            <EmptyState
              icon={Inbox}
              title={t(`${KEY}.empty.title`)}
              description={t(`${KEY}.empty.description`)}
            />
          ) : (
            <>
              <ul className="space-y-3">
                {leads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    lang={i18n.language}
                    busy={busy}
                    onSetStatus={(next, adminNotes) => onSetStatus(lead.id, next, adminNotes)}
                  />
                ))}
              </ul>
              <div className="pt-4">
                <CatalogPagination
                  base={KEY}
                  page={page}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            </>
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
  onSetStatus: (status: CatalogInterestStatus, adminNotes?: string) => void;
}) {
  const { t } = useTranslation();
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(lead.adminNotes ?? '');
  const submitted = new Date(lead.createdAtUtc).toLocaleString(lang, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const startEditing = () => {
    setNoteDraft(lead.adminNotes ?? '');
    setEditingNote(true);
  };

  const saveNote = () => {
    onSetStatus(lead.status, noteDraft.trim());
    setEditingNote(false);
  };

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

            <div className="pt-1">
              {editingNote ? (
                <div className="space-y-2">
                  <label
                    htmlFor={`note-${lead.id}`}
                    className="text-xs font-medium text-foreground"
                  >
                    {t(`${KEY}.adminNotes.label`)}
                  </label>
                  <Textarea
                    id={`note-${lead.id}`}
                    rows={2}
                    value={noteDraft}
                    maxLength={1000}
                    placeholder={t(`${KEY}.adminNotes.placeholder`)}
                    onChange={(e) => setNoteDraft(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={busy} onClick={saveNote}>
                      {busy ? t(`${KEY}.adminNotes.saving`) : t(`${KEY}.adminNotes.save`)}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setEditingNote(false)}
                    >
                      {t(`${KEY}.adminNotes.cancel`)}
                    </Button>
                  </div>
                </div>
              ) : lead.adminNotes ? (
                <div className="rounded-md border border-border bg-muted/40 p-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <StickyNote aria-hidden="true" className="size-3.5" />
                    {t(`${KEY}.adminNotes.heading`)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground" dir="auto">
                    {lead.adminNotes}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-auto p-0 text-xs"
                    disabled={busy}
                    onClick={startEditing}
                  >
                    {t(`${KEY}.adminNotes.edit`)}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-auto p-0 text-xs"
                  disabled={busy}
                  onClick={startEditing}
                >
                  <StickyNote aria-hidden="true" className="size-3.5" />
                  {t(`${KEY}.adminNotes.add`)}
                </Button>
              )}
            </div>
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

// --- URL-bound filter + paging --------------------------------------------

interface InterestUrlState {
  status: StatusFilter;
  page: number;
  setStatus: (status: StatusFilter) => void;
  setPage: (page: number) => void;
}

/** Binds the status filter + page to the query string so they survive reloads
 * and are shareable, mirroring the other staff list controllers. Changing the
 * filter resets to page 1. */
function useInterestUrlState(): InterestUrlState {
  const [params, setParams] = useSearchParams();

  const statusParam = params.get('status') ?? '';
  const status: StatusFilter = (STATUS_FILTERS as string[]).includes(statusParam)
    ? (statusParam as StatusFilter)
    : 'all';

  const pageParam = Number(params.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const setStatus = (next: StatusFilter) => {
    const p = new URLSearchParams(params);
    if (next === 'all') p.delete('status');
    else p.set('status', next);
    p.delete('page');
    setParams(p);
  };

  const setPage = (next: number) => {
    const p = new URLSearchParams(params);
    if (next <= 1) p.delete('page');
    else p.set('page', String(next));
    setParams(p);
  };

  return { status, page, setStatus, setPage };
}

// --- Dev-only fixtures (stripped from production) --------------------------

const DEV_STATES = ['loading', 'error', 'empty', 'populated', 'paginated'] as const;
type DevState = (typeof DEV_STATES)[number];

function readDevState(): DevState | null {
  if (typeof window === 'undefined') return null;
  const state = new URLSearchParams(window.location.search).get('state') ?? '';
  return (DEV_STATES as readonly string[]).includes(state) ? (state as DevState) : null;
}

function DevInterestLeads({ devState }: { devState: DevState }) {
  const { status, page, setStatus, setPage } = useInterestUrlState();
  const viewState: LeadsViewState =
    devState === 'loading'
      ? 'loading'
      : devState === 'error'
        ? 'error'
        : devState === 'empty'
          ? 'empty'
          : 'data';

  return (
    <InterestLeadsView
      status={status}
      onStatusChange={setStatus}
      page={page}
      totalPages={devState === 'paginated' ? 4 : 1}
      onPageChange={setPage}
      viewState={viewState}
      leads={viewState === 'data' ? devLeads() : []}
      busy={false}
      onSetStatus={() => {}}
    />
  );
}

function devLead(
  partial: Partial<AdminInterestLead> & Pick<AdminInterestLead, 'id'>,
): AdminInterestLead {
  return {
    sourceType: 'course',
    sourceSlug: 'python-adventures',
    sourceTitle: 'Python Adventures',
    parentName: 'Sara Ahmed',
    phone: '+20 100 000 0000',
    email: null,
    childAge: null,
    preferredLanguage: 'en',
    notes: null,
    status: 'new',
    createdAtUtc: '2026-07-12T09:30:00Z',
    updatedAtUtc: '2026-07-12T09:30:00Z',
    contactedAtUtc: null,
    archivedAtUtc: null,
    adminNotes: null,
    ...partial,
  };
}

function devLeads(): AdminInterestLead[] {
  return [
    devLead({ id: 'l1', childAge: 8, email: 'sara@example.com', notes: 'Wants a weekend group.' }),
    devLead({
      id: 'l2',
      sourceType: 'learningPath',
      sourceSlug: 'junior-coder-journey',
      sourceTitle: 'Junior Coder Journey',
      parentName: 'Mona Khaled',
      phone: '+20 122 333 4444',
      preferredLanguage: 'ar',
      status: 'contacted',
      contactedAtUtc: '2026-07-13T10:00:00Z',
      adminNotes: 'Called — will decide after the free trial week.',
    }),
    devLead({
      id: 'l3',
      parentName: 'Omar Fathy',
      phone: '01099998888',
      status: 'archived',
      archivedAtUtc: '2026-07-13T12:00:00Z',
    }),
  ];
}

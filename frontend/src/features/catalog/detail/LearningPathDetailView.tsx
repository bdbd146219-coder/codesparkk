import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Layers, Sparkles, Waypoints } from 'lucide-react';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogImage } from '@/components/catalog';
import { InterestDialog } from '../interest';
import type { CatalogPathDetail } from '@/lib/api/catalog';
import { ageBandLabelKey } from '../shared';
import { PublicCourseCard } from '../components/PublicCourseCard';
import {
  pathCourses,
  pathDisplayTitle,
  type LearningPathDetailViewModel,
} from './learning-path-detail';

const KEY = 'catalog.learningPaths.detail';

export interface LearningPathDetailViewProps {
  vm: LearningPathDetailViewModel;
  onRetry: () => void;
}

export function LearningPathDetailView({ vm, onRetry }: LearningPathDetailViewProps) {
  if (vm.status === 'loading') return <DetailSkeleton />;
  if (vm.status === 'notfound') return <NotFoundPanel />;
  if (vm.status === 'error') return <ErrorPanel messageKey={vm.messageKey} onRetry={onRetry} />;
  return <LearningPathDetail path={vm.path} />;
}

function LearningPathDetail({ path }: { path: CatalogPathDetail }) {
  const { t } = useTranslation();
  const [interestOpen, setInterestOpen] = useState(false);
  const title = pathDisplayTitle(path);
  const courses = pathCourses(path);

  return (
    <div className="min-h-full bg-gradient-to-b from-accent/5 via-background to-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-accent/10 to-background">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -end-20 -top-24 size-72 rounded-full bg-accent/15 blur-3xl"
        />
        <Container size="lg" padded>
          <div className="relative space-y-6 py-10 sm:py-12">
            <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit">
              <Link to="/catalog/learning-paths">
                <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                {t(`${KEY}.backToPaths`)}
              </Link>
            </Button>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div className="space-y-4">
                <Badge variant="secondary" className="font-medium">
                  {t('catalog.learningPaths.card.badge')}
                </Badge>
                <h1
                  className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                  dir="auto"
                >
                  {title}
                </h1>
                {path.summary?.trim() ? (
                  <p className="max-w-2xl text-base text-muted-foreground sm:text-lg" dir="auto">
                    {path.summary}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{t(ageBandLabelKey(path.ageBand))}</Badge>
                  <Badge variant="outline">
                    {t('catalog.learningPaths.card.courses', { count: courses.length })}
                  </Badge>
                </div>
              </div>

              <CatalogImage
                icon={Waypoints}
                mediaKey={path.thumbnailKey}
                alt={path.thumbnailAlt}
                kind="path"
                eager
                className="aspect-[4/3] rounded-2xl border border-border shadow-sm lg:aspect-[5/4]"
                iconClassName="size-16"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Course sequence + sidebar */}
      <Container size="lg" padded>
        <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {t(`${KEY}.sequence.heading`)}
              </h2>
              <p className="text-sm text-muted-foreground">{t(`${KEY}.sequence.lead`)}</p>
            </div>

            {courses.length > 0 ? (
              <ol className="grid gap-6 sm:grid-cols-2">
                {courses.map((course, i) => (
                  <li key={course.slug ?? i} className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute start-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold tabular-nums text-primary-foreground shadow-md"
                    >
                      {i + 1}
                    </span>
                    <span className="sr-only">{t(`${KEY}.sequence.step`, { step: i + 1 })}</span>
                    <PublicCourseCard course={course} />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Layers aria-hidden="true" className="size-6" />
                </span>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {t(`${KEY}.sequence.empty.title`)}
                  </p>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    {t(`${KEY}.sequence.empty.body`)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{t(`${KEY}.sidebar.detailsHeading`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <DetailRow label={t(`${KEY}.sidebar.ageBand`)}>
                    {t(ageBandLabelKey(path.ageBand))}
                  </DetailRow>
                  <DetailRow label={t(`${KEY}.sidebar.courses`)}>{courses.length}</DetailRow>
                </dl>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 shadow-md">
              <CardContent className="space-y-3 p-6 text-center">
                <span className="mx-auto inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles aria-hidden="true" className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {t(`${KEY}.access.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(`${KEY}.access.body`)}</p>
                </div>
                <Button type="button" className="w-full" onClick={() => setInterestOpen(true)}>
                  {t(`${KEY}.access.interestCta`)}
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/catalog/courses">{t(`${KEY}.access.browse`)}</Link>
                </Button>
                {interestOpen ? (
                  <InterestDialog
                    open
                    onOpenChange={setInterestOpen}
                    sourceType="learningPath"
                    sourceSlug={path.slug ?? ''}
                    sourceTitle={title ?? undefined}
                  />
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium text-foreground">{children}</dd>
    </div>
  );
}

// --- Non-data states --------------------------------------------------------

function DetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="min-h-full bg-gradient-to-b from-accent/5 via-background to-background">
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t(`${KEY}.loading`)}</span>
        <section className="border-b border-border bg-gradient-to-br from-primary/10 via-accent/10 to-background">
          <Container size="lg" padded>
            <div className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="flex gap-2 pt-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  ))}
                </div>
              </div>
              <div className="aspect-[5/4] animate-pulse rounded-2xl bg-muted" />
            </div>
          </Container>
        </section>
        <Container size="lg" padded>
          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-72 w-full animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
            <div className="h-56 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        </Container>
      </div>
    </div>
  );
}

function StatePanel({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-full bg-gradient-to-b from-accent/5 via-background to-background">
      <Container size="md" padded>
        <div
          role="alert"
          className="my-16 flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface/60 px-6 py-16 text-center shadow-sm"
        >
          <div className="space-y-1.5">
            <p className="text-xl font-semibold text-foreground">{title}</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">{body}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                {t(`${KEY}.error.retry`)}
              </Button>
            ) : null}
            <Button asChild variant={onRetry ? 'ghost' : 'outline'}>
              <Link to="/catalog/learning-paths">
                <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                {t(`${KEY}.backToPaths`)}
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}

function NotFoundPanel() {
  const { t } = useTranslation();
  return <StatePanel title={t(`${KEY}.notFound.title`)} body={t(`${KEY}.notFound.body`)} />;
}

function ErrorPanel({ messageKey, onRetry }: { messageKey: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return <StatePanel title={t(`${KEY}.error.title`)} body={t(messageKey)} onRetry={onRetry} />;
}

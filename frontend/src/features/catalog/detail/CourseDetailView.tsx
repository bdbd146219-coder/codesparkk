import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, CheckCircle2, PlayCircle, Sparkles } from 'lucide-react';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CatalogImage } from '@/components/catalog';
import { InterestDialog } from '../interest';
import type { CatalogCourseDetail } from '@/lib/api/catalog';
import { ageBandLabelKey, deliveryLabelKey, difficultyLabelKey } from '../shared';
import {
  courseDisplayTitle,
  courseLocales,
  courseModules,
  courseOutcomes,
  coursePrice,
  formatPrice,
  type CourseDetailViewModel,
} from './course-detail';

const KEY = 'catalog.courses.detail';

export interface CourseDetailViewProps {
  vm: CourseDetailViewModel;
  lang: string;
  onRetry: () => void;
}

export function CourseDetailView({ vm, lang, onRetry }: CourseDetailViewProps) {
  if (vm.status === 'loading') return <DetailSkeleton />;
  if (vm.status === 'notfound') return <NotFoundPanel />;
  if (vm.status === 'error') return <ErrorPanel messageKey={vm.messageKey} onRetry={onRetry} />;
  return <CourseDetail course={vm.course} lang={lang} />;
}

function CourseDetail({ course, lang }: { course: CatalogCourseDetail; lang: string }) {
  const { t } = useTranslation();
  const [interestOpen, setInterestOpen] = useState(false);
  const title = courseDisplayTitle(course);
  const outcomes = courseOutcomes(course);
  const modules = courseModules(course);
  const locales = courseLocales(course);
  const price = coursePrice(course.pricing);
  const priceLabel =
    price.kind === 'free'
      ? t(`${KEY}.price.free`)
      : price.kind === 'amount'
        ? formatPrice(price.amount, price.currency, lang)
        : t(`${KEY}.price.model.${price.model}`, { defaultValue: t(`${KEY}.price.seeDetails`) });

  return (
    <div className="min-h-full bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-accent/10 to-background">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -end-20 -top-24 size-72 rounded-full bg-primary/15 blur-3xl"
        />
        <Container size="lg" padded>
          <div className="relative space-y-6 py-10 sm:py-12">
            <Button asChild variant="ghost" size="sm" className="-ms-2 w-fit">
              <Link to="/catalog/courses">
                <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                {t('catalog.courses.backToBrowse')}
              </Link>
            </Button>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <div className="space-y-4">
                {course.category?.name ? (
                  <Badge variant="secondary" className="font-medium">
                    <span dir="auto">{course.category.name}</span>
                  </Badge>
                ) : null}
                <div className="space-y-2">
                  <h1
                    className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                    dir="auto"
                  >
                    {title}
                  </h1>
                  {course.subtitle?.trim() ? (
                    <p className="text-lg font-medium text-foreground/80" dir="auto">
                      {course.subtitle}
                    </p>
                  ) : null}
                </div>
                {course.summary?.trim() ? (
                  <p className="max-w-2xl text-base text-muted-foreground sm:text-lg" dir="auto">
                    {course.summary}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline">{t(ageBandLabelKey(course.ageBand))}</Badge>
                  <Badge variant="outline">{t(difficultyLabelKey(course.difficulty))}</Badge>
                  <Badge variant="outline">{t(deliveryLabelKey(course.deliveryType))}</Badge>
                  <Badge variant="outline">
                    {t(`${KEY}.ages`)}{' '}
                    <bdi>
                      {course.minAge}–{course.maxAge}
                    </bdi>
                  </Badge>
                </div>

                {course.promoVideoUrl ? (
                  <div className="pt-1">
                    <Button asChild variant="outline" size="sm">
                      <a href={course.promoVideoUrl} target="_blank" rel="noopener noreferrer">
                        <PlayCircle aria-hidden="true" />
                        {t(`${KEY}.watchIntro`)}
                      </a>
                    </Button>
                  </div>
                ) : null}
              </div>

              <CatalogImage
                icon={BookOpen}
                mediaKey={course.heroKey ?? course.thumbnailKey}
                alt={course.thumbnailAlt}
                kind="course"
                eager
                className="aspect-[4/3] rounded-2xl border border-border shadow-sm lg:aspect-[5/4]"
                iconClassName="size-16"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Main content + sidebar */}
      <Container size="lg" padded>
        <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="space-y-8">
            {course.description?.trim() ? (
              <Section heading={t(`${KEY}.sections.about`)}>
                <p
                  className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
                  dir="auto"
                >
                  {course.description}
                </p>
              </Section>
            ) : null}

            {outcomes.length > 0 ? (
              <Section heading={t(`${KEY}.sections.outcomes`)}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {outcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-primary"
                      />
                      <span dir="auto">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {modules.length > 0 ? (
              <Section heading={t(`${KEY}.sections.modules`)}>
                <ol className="space-y-3">
                  {modules.map((module, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
                    >
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-foreground" dir="auto">
                          {module.title?.trim() || t(`${KEY}.modules.untitled`)}
                        </p>
                        {module.summary?.trim() ? (
                          <p className="text-sm text-muted-foreground" dir="auto">
                            {module.summary}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{t(`${KEY}.sidebar.detailsHeading`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {course.category?.name ? (
                    <DetailRow label={t(`${KEY}.sidebar.category`)}>
                      <span dir="auto">{course.category.name}</span>
                    </DetailRow>
                  ) : null}
                  <DetailRow label={t(`${KEY}.sidebar.ages`)}>
                    <bdi>
                      {course.minAge}–{course.maxAge}
                    </bdi>
                  </DetailRow>
                  <DetailRow label={t(`${KEY}.sidebar.level`)}>
                    {t(difficultyLabelKey(course.difficulty))}
                  </DetailRow>
                  <DetailRow label={t(`${KEY}.sidebar.format`)}>
                    {t(deliveryLabelKey(course.deliveryType))}
                  </DetailRow>
                  <DetailRow label={t(`${KEY}.sidebar.price`)}>{priceLabel}</DetailRow>
                  {locales.length > 0 ? (
                    <DetailRow label={t(`${KEY}.sidebar.languages`)}>
                      {locales.map((l) => t(`${KEY}.locales.${l}`)).join(t(`${KEY}.listSeparator`))}
                    </DetailRow>
                  ) : null}
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
                    {t(`${KEY}.enroll.title`)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t(`${KEY}.enroll.body`)}</p>
                </div>
                <Button type="button" className="w-full" onClick={() => setInterestOpen(true)}>
                  {t(`${KEY}.enroll.interestCta`)}
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/catalog/courses">{t(`${KEY}.enroll.browse`)}</Link>
                </Button>
                {interestOpen ? (
                  <InterestDialog
                    open
                    onOpenChange={setInterestOpen}
                    sourceType="course"
                    sourceSlug={course.slug ?? ''}
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

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-foreground">{heading}</h2>
      {children}
    </section>
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
    <div className="min-h-full bg-gradient-to-b from-primary/5 via-background to-background">
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t(`${KEY}.loading`)}</span>
        <section className="border-b border-border bg-gradient-to-br from-primary/10 via-accent/10 to-background">
          <Container size="lg" padded>
            <div className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="flex gap-2 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
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
            <div className="space-y-4">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
            </div>
            <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />
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
    <div className="min-h-full bg-gradient-to-b from-primary/5 via-background to-background">
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
              <Link to="/catalog/courses">
                <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
                {t('catalog.courses.backToBrowse')}
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

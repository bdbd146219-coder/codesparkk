import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';

export function SkeletonPage() {
  const { t, i18n } = useTranslation();
  const stackItems = [
    t('skeleton.stackItems.backend'),
    t('skeleton.stackItems.frontend'),
    t('skeleton.stackItems.i18n'),
    t('skeleton.stackItems.ci'),
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          <span>{t('app.name')}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          {t('app.tagline')}
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('skeleton.title')}</h1>
        <p className="text-base text-muted-foreground sm:text-lg">{t('skeleton.description')}</p>
      </section>

      <section className="rounded-2xl border border-border bg-secondary/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('skeleton.stackHeading')}</h2>
        <ul className="space-y-2.5 ps-5 text-sm text-foreground/80 marker:text-primary">
          {stackItems.map((item) => (
            <li key={item} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div>
        <Button asChild>
          <Link to="/design-system">
            {t('skeleton.openDesignSystem')}
            <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        </Button>
      </div>

      <footer className="text-xs text-muted-foreground">
        <span>
          {t('skeleton.directionLabel')}:{' '}
          <code className="rounded bg-secondary px-1.5 py-0.5">{i18n.dir()}</code>
        </span>
      </footer>
    </main>
  );
}

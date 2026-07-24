import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export interface CatalogNavCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  body: string;
  cta: string;
  /** Heading level for the card title, so the card fits the page's outline. */
  headingLevel?: 2 | 3;
}

/**
 * Shared presentational entry card for the public catalog. A single accessible
 * link stretches over the whole card (`after:absolute after:inset-0`), so the
 * entire surface is one keyboard-focusable target. Used by the catalog landing
 * and the marketing homepage so both promote the catalog identically — a shared
 * concern, hence `components/` rather than a feature folder.
 */
export function CatalogNavCard({
  to,
  icon: Icon,
  title,
  body,
  cta,
  headingLevel = 3,
}: CatalogNavCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-fast focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-8">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <div className="space-y-1.5">
        <Heading className="font-display text-xl font-semibold text-foreground">
          <Link to={to} className="outline-none after:absolute after:inset-0 after:content-['']">
            {title}
          </Link>
        </Heading>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <p className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {cta}
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        />
      </p>
    </article>
  );
}

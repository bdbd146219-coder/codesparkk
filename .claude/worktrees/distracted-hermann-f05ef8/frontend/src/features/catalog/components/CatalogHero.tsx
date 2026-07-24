import type { ReactNode } from 'react';
import { Container } from '@/components/layout';

/**
 * Public catalog hero — a joyful-but-premium blue gradient band with soft
 * floating shapes, a kicker, a title, a lead, and an optional actions slot.
 * Lighter and friendlier than the admin editor heroes, while staying on the
 * Code Spark blue-modern identity.
 */
export function CatalogHero({
  kicker,
  title,
  lead,
  actions,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-accent/10 to-background">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-20 -top-24 size-72 rounded-full bg-primary/15 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -start-16 size-72 rounded-full bg-accent/15 blur-3xl"
      />
      <Container size="lg" padded>
        <div className="relative py-12 sm:py-16">
          <div className="max-w-2xl space-y-4">
            {kicker ? (
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">{kicker}</p>
            ) : null}
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {lead ? <p className="text-base text-muted-foreground sm:text-lg">{lead}</p> : null}
            {actions ? <div className="flex flex-wrap gap-3 pt-2">{actions}</div> : null}
          </div>
        </div>
      </Container>
    </section>
  );
}

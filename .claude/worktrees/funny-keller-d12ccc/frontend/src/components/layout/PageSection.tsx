import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageSection = React.forwardRef<HTMLElement, PageSectionProps>(
  ({ className, title, description, actions, children, ...props }, ref) => {
    const hasHeader = Boolean(title || description || actions);
    return (
      <section ref={ref} className={cn('space-y-4', className)} {...props}>
        {hasHeader ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </section>
    );
  },
);
PageSection.displayName = 'PageSection';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { PageTitle } from './PageTitle';

export interface PageHeaderProps {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ kicker, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-border pb-6',
        actions ? 'sm:flex-row sm:items-end sm:justify-between' : '',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {kicker ? (
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{kicker}</p>
        ) : null}
        <PageTitle>{title}</PageTitle>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

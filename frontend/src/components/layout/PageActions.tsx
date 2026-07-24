import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'between';
}

/**
 * Action row wrapper for buttons on the page header / footer.
 * Uses `justify-{start|end|between}` which honour the document direction —
 * `justify-end` lands on the visual right in LTR and the visual left in RTL.
 */
export function PageActions({ className, align = 'end', ...props }: PageActionsProps) {
  const alignment =
    align === 'between' ? 'justify-between' : align === 'start' ? 'justify-start' : 'justify-end';
  return (
    <div className={cn('flex flex-wrap items-center gap-2', alignment, className)} {...props} />
  );
}

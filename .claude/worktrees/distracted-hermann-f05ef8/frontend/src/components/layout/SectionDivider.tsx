import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
}

export function SectionDivider({ label, className, ...props }: SectionDividerProps) {
  if (!label) {
    return <hr className={cn('my-6 border-0 border-t border-border', className)} {...props} />;
  }
  return (
    <div
      role="separator"
      aria-label={typeof label === 'string' ? label : undefined}
      className={cn(
        'flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    >
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span className="font-medium">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

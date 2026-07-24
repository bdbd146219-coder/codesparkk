import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2;
}

export const PageTitle = React.forwardRef<HTMLHeadingElement, PageTitleProps>(
  ({ className, level = 1, ...props }, ref) => {
    const Tag = (level === 1 ? 'h1' : 'h2') as 'h1';
    return (
      <Tag
        ref={ref}
        className={cn(
          'font-display tracking-tight text-foreground',
          level === 1
            ? 'text-2xl font-bold sm:text-3xl lg:text-4xl'
            : 'text-xl font-semibold sm:text-2xl',
          className,
        )}
        {...props}
      />
    );
  },
);
PageTitle.displayName = 'PageTitle';

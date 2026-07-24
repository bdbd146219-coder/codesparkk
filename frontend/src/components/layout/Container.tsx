import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      sm: 'max-w-2xl', // ~672px — single-column forms, focused reading
      md: 'max-w-4xl', // ~896px — public marketing content
      lg: 'max-w-6xl', // ~1152px — student/parent dashboards
      xl: 'max-w-7xl', // ~1280px — staff dashboards with side rails
      full: 'max-w-none',
    },
    padded: {
      true: 'px-4 sm:px-6 lg:px-8',
      false: '',
    },
  },
  defaultVariants: { size: 'lg', padded: true },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: 'div' | 'main' | 'section' | 'article' | 'header' | 'footer';
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padded, as: Tag = 'div', ...props }, ref) => {
    return (
      <Tag
        ref={ref as React.Ref<HTMLDivElement>}
        className={cn(containerVariants({ size, padded }), className)}
        {...props}
      />
    );
  },
);
Container.displayName = 'Container';

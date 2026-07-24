import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: React.ReactNode;
  to?: string;
}

export interface BreadcrumbsProps {
  items: ReadonlyArray<BreadcrumbItem>;
  className?: string;
  ariaLabel?: string;
}

/**
 * RTL-aware breadcrumb trail. The separator icon flips horizontally in RTL via
 * `rtl:rotate-180`, so it always points along the reading direction.
 */
export function Breadcrumbs({ items, className, ariaLabel = 'Breadcrumb' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${index}-${typeof item.label === 'string' ? item.label : ''}`}
              className="flex items-center gap-1.5"
            >
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="rounded-sm text-muted-foreground transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'font-medium text-foreground' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

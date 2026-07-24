import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface BrandLockupProps {
  className?: string;
  to?: string;
  compact?: boolean;
}

export function BrandLockup({ className, to = '/', compact = false }: BrandLockupProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-semibold text-foreground',
        'transition-colors duration-fast hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      aria-label={t('app.name')}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
      >
        <Sparkles className="size-4" />
      </span>
      {compact ? null : (
        <span className="whitespace-nowrap font-display text-base">{t('app.name')}</span>
      )}
    </Link>
  );
}

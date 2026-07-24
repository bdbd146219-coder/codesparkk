import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_LOCALES, directionFor } from '@/i18n';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-sm',
        className,
      )}
      role="group"
      aria-label={t('skeleton.languageLabel')}
    >
      <Languages className="size-4 opacity-70" aria-hidden="true" />
      {SUPPORTED_LOCALES.map((lng) => {
        const active = current === lng;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => void i18n.changeLanguage(lng)}
            lang={lng}
            dir={directionFor(lng)}
            aria-pressed={active}
            className={cn(
              'rounded-full px-2.5 py-0.5 font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {t(`languages.${lng}`)}
          </button>
        );
      })}
    </div>
  );
}

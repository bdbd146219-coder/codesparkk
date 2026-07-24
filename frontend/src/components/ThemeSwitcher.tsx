import { Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { THEMES, type Theme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Palette aria-hidden="true" />
          <span>{t(`designSystem.themeNames.${theme}`)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('designSystem.themeLabel')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEMES.map((name) => (
          <DropdownMenuItem
            key={name}
            onSelect={() => setTheme(name as Theme)}
            aria-current={theme === name ? 'true' : undefined}
            className={theme === name ? 'font-semibold text-primary' : undefined}
          >
            {t(`designSystem.themeNames.${name}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

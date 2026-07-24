import { useCallback, useEffect, useState } from 'react';
import { applyTheme, persistTheme, readStoredTheme, type Theme } from '@/lib/theme';

export function useTheme(): readonly [Theme, (next: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  return [theme, setTheme] as const;
}

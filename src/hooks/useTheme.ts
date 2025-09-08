import { useEffect, useState } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const { isSuperAdmin } = useSuperAdmin();
  const storedSuper = localStorage.getItem('is-super-admin') === 'true';

  const [theme, setThemeState] = useState<Theme>(() => {
    if (storedSuper) {
      const stored = localStorage.getItem('theme') as Theme;
      return stored === 'light' || stored === 'dark' ? stored : 'dark';
    }
    return 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      setThemeState('dark');
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(systemPrefersDark ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme as ResolvedTheme);
      }
    };

    updateResolvedTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateResolvedTheme);

    return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(resolvedTheme);
    if (isSuperAdmin) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, resolvedTheme, isSuperAdmin]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (isSuperAdmin && e.key === 'theme') {
        const newTheme = (e.newValue as Theme) || 'dark';
        setThemeState(newTheme);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [isSuperAdmin]);

  const setTheme = (newTheme: Theme) => {
    if (isSuperAdmin) {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    if (isSuperAdmin) {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  };
}


import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  
  useEffect(() => {
    // Always set to dark mode for this project
    document.body.classList.add('dark');
    setTheme('dark');
  }, []);
  
  return {
    theme,
    isDark: theme === 'dark'
  };
};

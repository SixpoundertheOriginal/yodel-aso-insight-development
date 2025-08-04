import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function SimpleThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 transition-all duration-200"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 transition-all" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

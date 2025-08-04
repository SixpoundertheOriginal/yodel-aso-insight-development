import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.body.classList.contains("light"));
  }, []);

  const toggleTheme = () => {
    const body = document.body;
    if (isLight) {
      body.classList.remove("light");
      setIsLight(false);
    } else {
      body.classList.add("light");
      setIsLight(true);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 theme-toggle text-foreground hover:bg-muted"
    >
      {isLight ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

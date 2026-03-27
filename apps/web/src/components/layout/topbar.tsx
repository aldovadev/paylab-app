"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const icon = !mounted ? null
    : theme === "light" ? <Sun className="h-4 w-4" />
    : theme === "system" ? <Monitor className="h-4 w-4" />
    : <Moon className="h-4 w-4" />;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <h2 className="text-sm font-medium text-muted-foreground">Dashboard</h2>
      <button
        onClick={cycleTheme}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        {icon}
      </button>
    </header>
  );
}

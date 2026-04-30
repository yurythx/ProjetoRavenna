"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-9 items-center justify-center rounded-full border border-foreground/10 bg-background px-4 text-sm font-medium text-foreground hover:bg-foreground/5"
      >
        {theme === "dark" ? "Tema: Escuro" : "Tema: Claro"}
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className="inline-flex h-9 items-center justify-center rounded-full border border-foreground/10 bg-background px-3 text-sm font-medium text-foreground hover:bg-foreground/5"
      >
        Sistema
      </button>
    </div>
  );
}

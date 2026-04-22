"use client";

import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const titleMap: Array<{ match: RegExp; title: string }> = [
  { match: /^\/dashboard/, title: "Dashboard" },
  { match: /^\/teams/, title: "Teams" },
  { match: /^\/managers/, title: "Managers" },
  { match: /^\/players/, title: "Players" },
  { match: /^\/matchups/, title: "Matchups" },
  { match: /^\/seasons/, title: "Seasons" },
  { match: /^\/import/, title: "Import" },
];

export function MobileHeader() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextDark = storedTheme ? storedTheme === "dark" : prefersDark;
    root.classList.toggle("dark", nextDark);
    setIsDark(nextDark);
  }, []);

  const title = useMemo(
    () => titleMap.find((item) => item.match.test(pathname))?.title ?? "RCUP Board",
    [pathname],
  );

  const toggleTheme = () => {
    const nextDark = !isDark;
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("theme", nextDark ? "dark" : "light");
    setIsDark(nextDark);
  };

  return (
    <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <div className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
          RCUP
        </div>
        <h1 className="text-sm font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
          U
        </div>
      </div>
    </header>
  );
}

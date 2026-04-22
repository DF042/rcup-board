"use client";

import { useViewMode } from "@/hooks/useViewMode";

export function ViewToggle() {
  const mode = useViewMode();
  return <span className="text-xs text-muted-foreground">{mode === "mobile" ? "Mobile" : "Desktop"} view</span>;
}

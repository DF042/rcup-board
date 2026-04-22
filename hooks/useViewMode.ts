"use client";

import { useEffect, useState } from "react";
import type { ViewMode } from "@/types/views";

export function useViewMode(): ViewMode {
  const [mode, setMode] = useState<ViewMode>("desktop");

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setMode(mql.matches ? "mobile" : "desktop");
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return mode;
}

"use client";

import { useMemo, useState } from "react";
import type { FilterState } from "@/types/views";

export function useFilters(initial: FilterState = {}) {
  const [filters, setFilters] = useState<FilterState>(initial);
  const hasFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);

  return { filters, setFilters, hasFilters };
}

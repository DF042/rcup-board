"use client";

import { useMemo } from "react";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

export type FilterKey = "season" | "teamKey" | "managerId" | "position" | "week" | "search" | "view";

type Filters = {
  season?: number;
  teamKey?: string;
  managerId?: string;
  position?: string;
  week?: number;
  search?: string;
  view?: "team" | "manager";
};

const viewParser = parseAsStringLiteral(["team", "manager"]);

export function useFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      season: parseAsInteger,
      teamKey: parseAsString,
      managerId: parseAsString,
      position: parseAsString,
      week: parseAsInteger,
      search: parseAsString,
      view: viewParser,
    },
    { history: "push", shallow: true, clearOnDefault: true },
  );

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== null && value !== undefined && value !== "").length,
    [filters],
  );

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    return setFilters({ [key]: value ?? null } as Partial<typeof filters>);
  }

  function clearFilter<K extends keyof Filters>(key: K) {
    return setFilters({ [key]: null } as Partial<typeof filters>);
  }

  function clearAllFilters() {
    return setFilters({
      season: null,
      teamKey: null,
      managerId: null,
      position: null,
      week: null,
      search: null,
      view: null,
    });
  }

  return {
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount,
    isFiltered: activeFilterCount > 0,
  };
}

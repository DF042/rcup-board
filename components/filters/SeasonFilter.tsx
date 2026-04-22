"use client";

import { useFilters } from "@/hooks/useFilters";
import { Input } from "@/components/ui/input";

export function SeasonFilter() {
  const { filters, setFilter } = useFilters();

  return (
    <Input
      type="number"
      min={2000}
      max={2100}
      placeholder="Season"
      value={filters.season ?? ""}
      onChange={(event) => {
        const value = event.target.value.trim();
        setFilter("season", value ? Number(value) : undefined);
      }}
    />
  );
}

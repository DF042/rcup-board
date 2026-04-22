"use client";

import { Button } from "@/components/ui/button";
import { type FilterKey, useFilters } from "@/hooks/useFilters";
import { PositionFilter } from "@/components/filters/PositionFilter";
import { QueryBuilder } from "@/components/filters/QueryBuilder";
import { SeasonFilter } from "@/components/filters/SeasonFilter";

export function FilterBar() {
  const { filters, clearFilter, clearAllFilters, isFiltered } = useFilters();

  const chips = [
    filters.season ? { key: "season", label: "Season", value: String(filters.season) } : null,
    filters.position ? { key: "position", label: "Position", value: filters.position } : null,
    filters.week ? { key: "week", label: "Week", value: String(filters.week) } : null,
    filters.view ? { key: "view", label: "View", value: filters.view } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <div className="space-y-3 rounded border p-3">
      <div className="grid gap-2 md:grid-cols-4">
        <SeasonFilter />
        <PositionFilter />
        <div className="md:col-span-2">
          <QueryBuilder />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className="animate-in fade-in rounded-full border px-2 py-1 text-xs"
            onClick={() => clearFilter(chip.key as FilterKey)}
          >
            {chip.label}: {chip.value} ✕
          </button>
        ))}
        {isFiltered ? (
          <Button type="button" size="sm" variant="secondary" onClick={clearAllFilters}>
            Clear all
          </Button>
        ) : null}
      </div>
    </div>
  );
}

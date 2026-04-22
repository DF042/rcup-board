"use client";

import { Button } from "@/components/ui/button";
import { useFilters } from "@/hooks/useFilters";

const positions = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];

export function PositionFilter() {
  const { filters, setFilter } = useFilters();

  return (
    <div className="flex flex-wrap gap-1">
      {positions.map((position) => {
        const active = (filters.position ?? "ALL") === position;
        return (
          <Button
            key={position}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => setFilter("position", position === "ALL" ? undefined : position)}
          >
            {position}
          </Button>
        );
      })}
    </div>
  );
}

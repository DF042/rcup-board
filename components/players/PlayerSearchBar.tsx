"use client";

import { Search, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { useFilters } from "@/hooks/useFilters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PlayerSearchBar() {
  const { filters, setFilter } = useFilters();

  const onChange = useDebouncedCallback((value: string) => {
    setFilter("search", value || undefined);
  }, 300);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={filters.search ?? ""}
          className="pl-8"
          placeholder="Search players"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {filters.search ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setFilter("search", undefined)}>
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

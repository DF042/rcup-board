import { PositionFilter } from "@/components/filters/PositionFilter";
import { QueryBuilder } from "@/components/filters/QueryBuilder";
import { SeasonFilter } from "@/components/filters/SeasonFilter";

export function FilterBar() {
  return (
    <div className="grid gap-2 rounded border p-3 md:grid-cols-3">
      <SeasonFilter />
      <PositionFilter />
      <QueryBuilder />
    </div>
  );
}

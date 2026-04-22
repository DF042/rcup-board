import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
}

export function SkeletonTable({ rows = 8, cols = 5, showHeader = true }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded border">
      <div className="space-y-2 p-3">
        {showHeader ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }, (_, idx) => (
              <Skeleton key={`header-${idx}`} className="h-4" />
            ))}
          </div>
        ) : null}
        {Array.from({ length: rows }, (_, rowIdx) => (
          <div key={`row-${rowIdx}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }, (_, colIdx) => (
              <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

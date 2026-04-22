import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-10 w-40" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, idx) => (
          <SkeletonCard key={idx} lines={2} />
        ))}
      </div>
      <SkeletonTable rows={8} cols={9} />
      <div className="space-y-3">
        {Array.from({ length: 2 }, (_, idx) => (
          <div key={idx} className="rounded border p-3">
            <Skeleton className="mb-2 h-4 w-28" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

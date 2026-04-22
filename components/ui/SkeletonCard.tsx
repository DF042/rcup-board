import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
}

export function SkeletonCard({ showAvatar = false, lines = 3 }: SkeletonCardProps) {
  return (
    <div className="rounded border p-3">
      {showAvatar ? (
        <div className="mb-3 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : null}
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, idx) => (
          <Skeleton key={idx} className={cn("h-4", idx === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

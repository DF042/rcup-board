import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-10 w-full max-w-sm" />
      <SkeletonTable rows={25} cols={6} />
    </div>
  );
}

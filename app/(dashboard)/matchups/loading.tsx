import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 py-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 8 }, (_, idx) => (
          <Skeleton key={idx} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, idx) => (
          <div key={idx} className="rounded border p-3">
            <Skeleton className="mb-2 h-4 w-24" />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

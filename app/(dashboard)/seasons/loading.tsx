import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function Loading() {
  return (
    <div className="space-y-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, idx) => (
          <SkeletonCard key={idx} lines={4} />
        ))}
      </div>
    </div>
  );
}

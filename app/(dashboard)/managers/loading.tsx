import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function Loading() {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 8 }, (_, idx) => (
        <SkeletonCard key={idx} showAvatar lines={4} />
      ))}
    </div>
  );
}

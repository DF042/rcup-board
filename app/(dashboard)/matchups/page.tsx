import { MatchupCard } from "@/components/matchups/MatchupCard";
import { WeeklyScoreBreakdown } from "@/components/matchups/WeeklyScoreBreakdown";

export default function MatchupsPage() {
  return (
    <div className="space-y-4 py-4">
      <MatchupCard />
      <WeeklyScoreBreakdown />
    </div>
  );
}

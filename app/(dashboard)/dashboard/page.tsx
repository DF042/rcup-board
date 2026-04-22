import { RecentMatchups } from "@/components/dashboard/RecentMatchups";
import { SeasonSummaryCard } from "@/components/dashboard/SeasonSummaryCard";
import { StandingsTable } from "@/components/dashboard/StandingsTable";

export default function DashboardPage() {
  return (
    <div className="space-y-4 py-4">
      <SeasonSummaryCard />
      <StandingsTable />
      <RecentMatchups />
    </div>
  );
}

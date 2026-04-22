import { FilterBar } from "@/components/filters/FilterBar";
import { ScoringBarChart } from "@/components/charts/ScoringBarChart";
import { StandingsLineChart } from "@/components/charts/StandingsLineChart";
import { WinRateRadarChart } from "@/components/charts/WinRateRadarChart";

export default function SeasonsPage() {
  return (
    <div className="space-y-4 py-4">
      <FilterBar />
      <StandingsLineChart />
      <ScoringBarChart />
      <WinRateRadarChart />
    </div>
  );
}

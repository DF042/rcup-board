import { FilterBar } from "@/components/filters/FilterBar";
import { Calendar } from "lucide-react";
import { ScoringBarChart } from "@/components/charts/ScoringBarChart";
import { StandingsLineChart } from "@/components/charts/StandingsLineChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAllSeasons, getTopScorers } from "@/lib/db/queries";

export const revalidate = 300;

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ compare?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAllSeasons();
  if (seasons.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          icon={Calendar}
          title="No seasons imported yet"
          description="Import your first season to unlock comparisons and charts."
        />
      </div>
    );
  }

  const compare = params.compare?.split(",").map((value) => Number(value)).filter(Boolean) ?? seasons.slice(0, 2).map((value) => value.season);

  const scorerMap = new Map<number, string>();
  await Promise.all(
    compare.map(async (season) => {
      const top = await getTopScorers({ season, limit: 1 });
      scorerMap.set(season, top[0]?.name ?? "—");
    }),
  );

  return (
    <div className="space-y-4 py-4">
      <FilterBar />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {seasons.map((season) => (
          <div key={season.leagueId} className="rounded border p-3">
            <p className="text-xs text-muted-foreground">{season.leagueName}</p>
            <p className="text-2xl font-semibold">{season.season}</p>
            <p className="text-sm">Champion: {season.champion ?? "—"}</p>
            <p className="text-sm">Teams: {season.numTeams}</p>
            <p className="text-sm">Avg Score: {season.avgScore.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded border p-3">
        <h3 className="font-semibold">Year-over-year comparison</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {compare.map((season) => (
            <div key={season} className="rounded border p-2 text-sm">
              <p className="font-medium">{season}</p>
              <p>Top scorer: {scorerMap.get(season) ?? "—"}</p>
            </div>
          ))}
        </div>
      </div>

      <ScoringBarChart data={seasons.map((season) => ({ season: season.season, score: season.avgScore }))} />
      <StandingsLineChart data={seasons.map((season, index) => ({ season: season.season, rank: index + 1 }))} />
    </div>
  );
}

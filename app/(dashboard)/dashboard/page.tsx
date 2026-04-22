import Link from "next/link";
import { RecentMatchups } from "@/components/dashboard/RecentMatchups";
import { SeasonSummaryCard } from "@/components/dashboard/SeasonSummaryCard";
import { StandingsTable } from "@/components/dashboard/StandingsTable";
import { getAllSeasons, getCurrentWeek, getMatchups, getStandings, getTopScorers } from "@/lib/db/queries";

export const revalidate = 300;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAllSeasons();
  const selectedSeason = params.season ? Number(params.season) : seasons[0]?.season;
  const seasonLeague = seasons.find((season) => season.season === selectedSeason) ?? seasons[0];

  if (!seasonLeague) {
    return <div className="py-4 text-sm text-muted-foreground">No season data available yet.</div>;
  }

  const [standings, currentWeek, allMatchups, topScorers] = await Promise.all([
    getStandings(String(seasonLeague.leagueId), selectedSeason),
    getCurrentWeek(String(seasonLeague.leagueId)),
    getMatchups({ leagueId: String(seasonLeague.leagueId), season: selectedSeason }),
    getTopScorers({ season: selectedSeason ?? seasonLeague.season, limit: 5 }),
  ]);

  const currentWeekMatchups = allMatchups.filter((row) => row.week === currentWeek);
  const avgWeekScore =
    currentWeekMatchups.length > 0
      ? currentWeekMatchups.reduce((sum, row) => sum + row.team1Points + row.team2Points, 0) /
        (currentWeekMatchups.length * 2)
      : 0;

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Season:</span>
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <Link
              key={season.season}
              href={`/dashboard?season=${season.season}`}
              className={`rounded border px-2 py-1 text-sm ${season.season === selectedSeason ? "bg-primary text-primary-foreground" : ""}`}
            >
              {season.season}
            </Link>
          ))}
        </div>
      </div>

      <SeasonSummaryCard
        currentWeek={currentWeek}
        totalTeams={seasonLeague.numTeams}
        avgScore={avgWeekScore}
        totalTransactions={0}
      />

      <StandingsTable rows={standings} />

      <div className="rounded border p-4">
        <h3 className="mb-2 font-semibold">Top 5 Scorers</h3>
        <ul className="space-y-1 text-sm">
          {topScorers.slice(0, 5).map((player) => (
            <li key={player.playerId} className="flex items-center justify-between">
              <span>
                {player.name} <span className="text-muted-foreground">({player.position})</span>
              </span>
              <span className="font-medium">{player.points.toFixed(2)}</span>
            </li>
          ))}
          {topScorers.length === 0 ? <li className="text-muted-foreground">No scorer data available.</li> : null}
        </ul>
      </div>

      <RecentMatchups matchups={currentWeekMatchups} />
    </div>
  );
}

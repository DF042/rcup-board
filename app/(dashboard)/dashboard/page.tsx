import Link from "next/link";
import { RecentMatchups } from "@/components/dashboard/RecentMatchups";
import { SeasonSummaryCard } from "@/components/dashboard/SeasonSummaryCard";
import { StandingsTable } from "@/components/dashboard/StandingsTable";
import { ChampionHistoryTable } from "@/components/dashboard/PlayoffHistoryTable";
import { PlayoffBracket } from "@/components/dashboard/PlayoffBracket";
import { getAllSeasons, getChampionHistory, getCurrentWeek, getMatchups, getPlayoffResults, getRoster, getStandings, getTopScorers } from "@/lib/db/queries";
import type { RosterPlayer } from "@/lib/db/queries";

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

  const selectedSeasonNum = selectedSeason ?? seasonLeague.season;
  const [standings, currentWeek, allMatchups, topQBs, topWRs, topRBs, championHistory, playoffResults] = await Promise.all([
    getStandings(String(seasonLeague.leagueId), selectedSeason),
    getCurrentWeek(String(seasonLeague.leagueId)),
    getMatchups({ leagueId: String(seasonLeague.leagueId), season: selectedSeason }),
    getTopScorers({ season: selectedSeasonNum, position: "QB", limit: 5 }),
    getTopScorers({ season: selectedSeasonNum, position: "WR", limit: 5 }),
    getTopScorers({ season: selectedSeasonNum, position: "RB", limit: 5 }),
    getChampionHistory(),
    getPlayoffResults({ leagueId: String(seasonLeague.leagueId), season: selectedSeason }),
  ]);

  const currentWeekMatchups = allMatchups.filter((row) => row.week === currentWeek);
  const avgWeekScore =
    currentWeekMatchups.length > 0
      ? currentWeekMatchups.reduce((sum, row) => sum + row.team1Points + row.team2Points, 0) /
        (currentWeekMatchups.length * 2)
      : 0;

  // Compute playoff PF/PA and expected wins per team from allMatchups so the
  // standings table can adjust its numbers when "Regular Season Only" is toggled.
  const playoffPointsByTeam = new Map<number, { pf: number; pa: number }>();
  const playoffWeekScores = new Map<number, Array<{ teamId: number; points: number }>>();
  for (const m of allMatchups) {
    if (!m.isPlayoffs) continue;
    const t1 = playoffPointsByTeam.get(m.team1Id) ?? { pf: 0, pa: 0 };
    t1.pf += m.team1Points;
    t1.pa += m.team2Points;
    playoffPointsByTeam.set(m.team1Id, t1);
    const t2 = playoffPointsByTeam.get(m.team2Id) ?? { pf: 0, pa: 0 };
    t2.pf += m.team2Points;
    t2.pa += m.team1Points;
    playoffPointsByTeam.set(m.team2Id, t2);

    // Collect all scores per week for expected-wins calculation
    const weekList = playoffWeekScores.get(m.week) ?? [];
    weekList.push({ teamId: m.team1Id, points: m.team1Points });
    weekList.push({ teamId: m.team2Id, points: m.team2Points });
    playoffWeekScores.set(m.week, weekList);
  }

  // Compute playoff expected wins (all-play formula) across playoff weeks
  const playoffXWinsByTeam = new Map<number, number>();
  for (const [, scores] of playoffWeekScores) {
    const n = scores.length;
    if (n < 2) continue;
    const denom = n - 1;
    for (const { teamId, points } of scores) {
      const beaten = scores.filter((s) => s.teamId !== teamId && s.points < points).length;
      playoffXWinsByTeam.set(teamId, (playoffXWinsByTeam.get(teamId) ?? 0) + beaten / denom);
    }
  }

  const enrichedPlayoffResults = playoffResults.map((r) => ({
    ...r,
    playoffPointsFor: playoffPointsByTeam.get(r.teamId)?.pf ?? 0,
    playoffPointsAgainst: playoffPointsByTeam.get(r.teamId)?.pa ?? 0,
    playoffExpectedWins: playoffXWinsByTeam.get(r.teamId) ?? 0,
  }));

  // Build roster map for playoff (non-consolation) matchups so the bracket can
  // show player breakdowns on click.
  const playoffMatchups = allMatchups.filter((m) => m.isPlayoffs && !m.isConsolation);
  const uniqueTeamWeeks = [
    ...new Set(playoffMatchups.flatMap((m) => [`${m.team1Id}_${m.week}`, `${m.team2Id}_${m.week}`])),
  ];
  const playoffRosterMap: Record<string, RosterPlayer[]> = {};
  await Promise.all(
    uniqueTeamWeeks.map(async (key) => {
      const sep = key.lastIndexOf("_");
      const teamIdStr = key.slice(0, sep);
      const weekStr = key.slice(sep + 1);
      playoffRosterMap[key] = await getRoster(teamIdStr, Number(weekStr), selectedSeason);
    }),
  );

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

      <StandingsTable rows={standings} playoffResults={enrichedPlayoffResults} />

      <div className="rounded border p-4">
        <h3 className="mb-3 font-semibold">Top Scorers by Position</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              { label: "Top 5 QBs", scorers: topQBs },
              { label: "Top 5 WRs", scorers: topWRs },
              { label: "Top 5 Running Backs", scorers: topRBs },
            ] as const
          ).map(({ label, scorers }) => (
            <div key={label} className="rounded border p-3">
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</h4>
              <ul className="space-y-1 text-sm">
                {scorers.slice(0, 5).map((player) => (
                  <li key={player.playerId} className="flex items-center justify-between">
                    <span className="truncate pr-2">{player.name}</span>
                    <span className="shrink-0 font-medium">{player.points.toFixed(2)}</span>
                  </li>
                ))}
                {scorers.length === 0 ? (
                  <li className="text-muted-foreground">No data available.</li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <RecentMatchups matchups={currentWeekMatchups} />

      <div className="rounded border p-4">
        <h3 className="mb-2 font-semibold">Playoff Bracket — {selectedSeason}</h3>
        <PlayoffBracket matchups={playoffMatchups} rosterMap={playoffRosterMap} />
      </div>

      <div className="rounded border p-4">
        <h3 className="mb-2 font-semibold">Champion History</h3>
        <ChampionHistoryTable rows={championHistory} />
      </div>
    </div>
  );
}

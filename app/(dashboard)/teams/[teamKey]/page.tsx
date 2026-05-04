import { StandingsLineChart } from "@/components/charts/StandingsLineChart";
import { TeamRosterList } from "@/components/teams/TeamRosterList";
import { TeamStatsTable } from "@/components/teams/TeamStatsTable";
import { getCurrentWeek, getMatchups, getRoster, getTeamByKey, getTeamSeasonHistory, getTeams } from "@/lib/db/queries";

export const revalidate = 300;

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamKey: string }>;
  searchParams: Promise<{ tab?: "overview" | "roster" | "matchups" | "history"; playoffOnly?: string }>;
}) {
  const { teamKey } = await params;
  const { tab = "overview", playoffOnly: playoffOnlyParam } = await searchParams;
  const playoffOnly = playoffOnlyParam === "true";

  const team = await getTeamByKey(teamKey);
  if (!team) {
    return <div className="py-4 text-sm text-muted-foreground">Team not found.</div>;
  }

  const [history, allTeams, week, matchups] = await Promise.all([
    getTeamSeasonHistory(teamKey),
    getTeams({ season: team.season, leagueId: String(team.leagueId) }),
    getCurrentWeek(String(team.leagueId)),
    getMatchups({ teamId: String(team.id), season: team.season }),
  ]);

  const roster = await getRoster(String(team.id), week, team.season);

  const leagueAvg = {
    pointsFor: allTeams.length ? allTeams.reduce((sum, row) => sum + row.pointsFor, 0) / allTeams.length : 0,
    pointsAgainst: allTeams.length ? allTeams.reduce((sum, row) => sum + row.pointsAgainst, 0) / allTeams.length : 0,
  };

  const tabs = [
    ["overview", "Overview"],
    ["roster", "Roster"],
    ["matchups", "Matchups"],
    ["history", "Season History"],
  ] as const;

  return (
    <div className="space-y-4 py-4">
      <div>
        <h2 className="text-lg font-semibold">{team.name}</h2>
        <p className="text-sm text-muted-foreground">Managed by {team.managerNickname ?? "—"}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <a key={value} href={`/teams/${teamKey}?tab=${value}`} className={`rounded border px-2 py-1 text-sm ${tab === value ? "bg-primary text-primary-foreground" : ""}`}>
            {label}
          </a>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Record" value={`${team.wins}-${team.losses}-${team.ties}`} />
            <StatCard label="Points For" value={team.pointsFor.toFixed(2)} />
            <StatCard label="Points Against" value={team.pointsAgainst.toFixed(2)} />
            <StatCard label="Rank" value={`#${team.rank}`} />
          </div>
          <TeamRosterList roster={roster} />
          <TeamStatsTable team={team} leagueAverages={leagueAvg} />
        </div>
      ) : null}

      {tab === "roster" ? <TeamRosterList roster={roster} /> : null}

      {tab === "matchups" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <a
              href={`/teams/${teamKey}?tab=matchups`}
              className={`rounded-full border px-3 py-1 text-xs ${!playoffOnly ? "bg-primary text-primary-foreground" : ""}`}
            >
              Regular Season
            </a>
            <a
              href={`/teams/${teamKey}?tab=matchups&playoffOnly=true`}
              className={`rounded-full border px-3 py-1 text-xs ${playoffOnly ? "bg-primary text-primary-foreground" : ""}`}
            >
              Playoffs
            </a>
          </div>
          <div className="overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-2 py-2">Week</th>
                <th className="px-2 py-2">Opponent</th>
                <th className="px-2 py-2">Score</th>
                <th className="px-2 py-2">Result</th>
                {playoffOnly ? <th className="px-2 py-2">Type</th> : null}
              </tr>
            </thead>
            <tbody>
              {matchups
                .filter((row) => (playoffOnly ? row.isPlayoffs : !row.isPlayoffs))
                .map((row) => {
                const isTeam1 = row.team1Id === team.id;
                const opp = isTeam1 ? row.team2Name : row.team1Name;
                const score = isTeam1 ? `${row.team1Points.toFixed(2)} - ${row.team2Points.toFixed(2)}` : `${row.team2Points.toFixed(2)} - ${row.team1Points.toFixed(2)}`;
                const won = row.winnerTeamId === team.id;
                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-2 py-2">{row.week}</td>
                    <td className="px-2 py-2">{opp}</td>
                    <td className="px-2 py-2">{score}</td>
                    <td className="px-2 py-2">{row.winnerTeamId ? (won ? "W" : "L") : "T"}</td>
                    {playoffOnly ? (
                      <td className="px-2 py-2">
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                          {row.isConsolation ? "Consolation" : "Playoff"}
                        </span>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-3">
          <StandingsLineChart data={history.map((row) => ({ season: row.season, rank: row.finalRank }))} />
          <div className="overflow-hidden rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-2 py-2">Season</th>
                  <th className="px-2 py-2">Team</th>
                  <th className="px-2 py-2">Record</th>
                  <th className="px-2 py-2">PF</th>
                  <th className="px-2 py-2">PA</th>
                  <th className="px-2 py-2">Rank</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={`${row.season}-${row.teamName}`} className="border-t">
                    <td className="px-2 py-2">{row.season}</td>
                    <td className="px-2 py-2">{row.teamName}</td>
                    <td className="px-2 py-2">{row.wins}-{row.losses}-{row.ties}</td>
                    <td className="px-2 py-2">{row.pointsFor.toFixed(2)}</td>
                    <td className="px-2 py-2">{row.pointsAgainst.toFixed(2)}</td>
                    <td className="px-2 py-2">#{row.finalRank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}


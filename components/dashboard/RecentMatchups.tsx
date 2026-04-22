import Link from "next/link";
import type { MatchupWithTeams } from "@/lib/db/queries";

export function RecentMatchups({ matchups }: { matchups: MatchupWithTeams[] }) {
  return (
    <div className="space-y-3 rounded border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Recent Matchups</h3>
        <Link className="text-xs text-primary underline" href="/matchups">
          View all matchups
        </Link>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {matchups.map((matchup) => {
          const leftWinner = matchup.winnerTeamId === matchup.team1Id;
          const rightWinner = matchup.winnerTeamId === matchup.team2Id;

          return (
            <article key={matchup.id} className="grid grid-cols-2 gap-2 rounded border p-3 text-sm">
              <div className={`rounded p-2 ${leftWinner ? "bg-emerald-50" : "bg-muted/20"}`}>
                <p className="text-2xl font-semibold">{matchup.team1Points.toFixed(2)}</p>
                <p>{matchup.team1Name}</p>
                <p className="text-xs text-muted-foreground">{matchup.team1ManagerName ?? "—"}</p>
              </div>
              <div className={`rounded p-2 ${rightWinner ? "bg-emerald-50" : "bg-muted/20"}`}>
                <p className="text-2xl font-semibold">{matchup.team2Points.toFixed(2)}</p>
                <p>{matchup.team2Name}</p>
                <p className="text-xs text-muted-foreground">{matchup.team2ManagerName ?? "—"}</p>
              </div>
            </article>
          );
        })}
      </div>
      {matchups.length === 0 ? <p className="text-sm text-muted-foreground">No recent matchups.</p> : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchupWithTeams } from "@/lib/db/queries";

export function RecentMatchups({ matchups }: { matchups: MatchupWithTeams[] }) {
  const [regularSeasonOnly, setRegularSeasonOnly] = useState(true);

  const displayed = regularSeasonOnly ? matchups.filter((m) => !m.isPlayoffs) : matchups;

  return (
    <div className="space-y-3 rounded border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Recent Matchups</h3>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={regularSeasonOnly}
              onChange={(e) => setRegularSeasonOnly(e.target.checked)}
              className="accent-primary"
            />
            Regular Season Only
          </label>
          <Link className="text-xs text-primary underline" href="/matchups">
            View all matchups
          </Link>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {displayed.map((matchup) => {
          const leftWinner = matchup.winnerTeamId === matchup.team1Id;
          const rightWinner = matchup.winnerTeamId === matchup.team2Id;

          return (
            <article key={matchup.id} className="grid grid-cols-2 gap-2 rounded border p-3 text-sm">
              {matchup.isPlayoffs ? (
                <div className="col-span-2 mb-1">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                    {matchup.isConsolation ? "Consolation" : "Playoffs"} 🏆
                  </span>
                </div>
              ) : null}
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
      {displayed.length === 0 ? <p className="text-sm text-muted-foreground">No recent matchups.</p> : null}
    </div>
  );
}

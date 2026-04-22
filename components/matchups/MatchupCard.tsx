"use client";

import { useState } from "react";
import type { MatchupWithTeams, RosterPlayer } from "@/lib/db/queries";
import { WeeklyScoreBreakdown } from "@/components/matchups/WeeklyScoreBreakdown";

export function MatchupCard({
  matchup,
  leftRoster,
  rightRoster,
}: {
  matchup: MatchupWithTeams;
  leftRoster: RosterPlayer[];
  rightRoster: RosterPlayer[];
}) {
  const [open, setOpen] = useState(false);
  const leftWinner = matchup.winnerTeamId === matchup.team1Id;
  const rightWinner = matchup.winnerTeamId === matchup.team2Id;

  return (
    <article className="rounded border p-3">
      <button type="button" className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <div className="mb-2 text-xs text-muted-foreground">
          Week {matchup.week} · {matchup.season}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className={`rounded p-2 ${leftWinner ? "bg-emerald-50" : "bg-muted/20"}`}>
            <p className={`text-base ${leftWinner ? "font-bold" : "font-medium"}`}>{matchup.team1Name}</p>
            <p className="text-xs text-muted-foreground">{matchup.team1ManagerName ?? "—"}</p>
            <p className="text-2xl font-semibold">{matchup.team1Points.toFixed(2)}</p>
          </div>
          <div className="text-center text-sm font-semibold">VS</div>
          <div className={`rounded p-2 ${rightWinner ? "bg-emerald-50" : "bg-muted/20"}`}>
            <p className={`text-base ${rightWinner ? "font-bold" : "font-medium"}`}>{matchup.team2Name}</p>
            <p className="text-xs text-muted-foreground">{matchup.team2ManagerName ?? "—"}</p>
            <p className="text-2xl font-semibold">{matchup.team2Points.toFixed(2)}</p>
          </div>
        </div>
      </button>
      {open ? <div className="mt-2"><WeeklyScoreBreakdown leftRoster={leftRoster} rightRoster={rightRoster} /></div> : null}
    </article>
  );
}

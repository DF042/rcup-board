"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import type { MatchupWithTeams, RosterPlayer } from "@/lib/db/queries";
import { WeeklyScoreBreakdown } from "@/components/matchups/WeeklyScoreBreakdown";
import { EmptyState } from "@/components/ui/EmptyState";

function getRoundLabel(totalRounds: number, roundIndex: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return "Championship";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${roundIndex + 1}`;
}

function MatchupNode({
  matchup,
  expanded,
  leftRoster,
  rightRoster,
  onToggle,
}: {
  matchup: MatchupWithTeams;
  expanded: boolean;
  leftRoster: RosterPlayer[];
  rightRoster: RosterPlayer[];
  onToggle: () => void;
}) {
  const t1Won = matchup.winnerTeamId === matchup.team1Id;
  const t2Won = matchup.winnerTeamId === matchup.team2Id;

  return (
    <div className="overflow-hidden rounded border bg-card shadow-sm">
      <button
        type="button"
        className="w-full p-2 text-left transition-colors hover:bg-muted/30"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div
          className={`flex items-center justify-between gap-2 rounded px-1 py-0.5 text-sm ${t1Won ? "bg-emerald-50 font-bold text-emerald-700" : "text-muted-foreground"}`}
        >
          <span className="truncate">{matchup.team1Name}</span>
          <span className="shrink-0 font-mono">{matchup.team1Points.toFixed(2)}</span>
        </div>
        <div
          className={`flex items-center justify-between gap-2 rounded px-1 py-0.5 text-sm ${t2Won ? "bg-emerald-50 font-bold text-emerald-700" : "text-muted-foreground"}`}
        >
          <span className="truncate">{matchup.team2Name}</span>
          <span className="shrink-0 font-mono">{matchup.team2Points.toFixed(2)}</span>
        </div>
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {expanded ? "▲ Hide players" : "▼ Show players"}
        </p>
      </button>
      {expanded ? (
        <div className="border-t bg-muted/10 p-2">
          <WeeklyScoreBreakdown leftRoster={leftRoster} rightRoster={rightRoster} />
        </div>
      ) : null}
    </div>
  );
}

export function PlayoffBracket({
  matchups,
  rosterMap,
}: {
  matchups: MatchupWithTeams[];
  rosterMap: Record<string, RosterPlayer[]>;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const bracketMatchups = matchups.filter((m) => m.isPlayoffs && !m.isConsolation);

  if (bracketMatchups.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No playoff data yet"
        description="Import playoff matchup data to see the bracket."
      />
    );
  }

  const weeks = [...new Set(bracketMatchups.map((m) => m.week))].sort((a, b) => a - b);

  const MIN_ROUND_WIDTH = 200;
  const MIN_BRACKET_WIDTH = 400;

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="flex gap-4"
        style={{ minWidth: `${Math.max(weeks.length * MIN_ROUND_WIDTH, MIN_BRACKET_WIDTH)}px` }}
      >
        {weeks.map((week, roundIndex) => {
          const roundMatchups = bracketMatchups.filter((m) => m.week === week);
          const label = getRoundLabel(weeks.length, roundIndex);

          return (
            <div key={week} className="flex flex-1 flex-col gap-3">
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <div className="flex flex-col justify-around gap-4">
                {roundMatchups.map((matchup) => {
                  const isExpanded = expandedId === matchup.id;
                  const leftRoster = rosterMap[`${matchup.team1Id}_${week}`] ?? [];
                  const rightRoster = rosterMap[`${matchup.team2Id}_${week}`] ?? [];
                  return (
                    <MatchupNode
                      key={matchup.id}
                      matchup={matchup}
                      expanded={isExpanded}
                      leftRoster={leftRoster}
                      rightRoster={rightRoster}
                      onToggle={() =>
                        setExpandedId(isExpanded ? null : matchup.id)
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

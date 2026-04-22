"use client";

import { useMemo, useState } from "react";
import type { PlayerWithStats } from "@/lib/db/queries";

type SortKey = "name" | "position" | "nflTeam" | "seasonPoints" | "weekAvg" | "bestWeek" | "ownerTeamName";

const colors: Record<string, string> = {
  QB: "bg-red-100 text-red-700",
  RB: "bg-blue-100 text-blue-700",
  WR: "bg-green-100 text-green-700",
  TE: "bg-purple-100 text-purple-700",
  K: "bg-gray-100 text-gray-700",
  DEF: "bg-yellow-100 text-yellow-700",
};

export function PlayerStatsTable({ players, total, page, pageSize }: { players: PlayerWithStats[]; total: number; page: number; pageSize: number }) {
  const [sortBy, setSortBy] = useState<SortKey>("seasonPoints");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...players];
    copy.sort((a, b) => {
      const left = a[sortBy] ?? "";
      const right = b[sortBy] ?? "";
      if (typeof left === "string" || typeof right === "string") {
        return `${left}`.localeCompare(`${right}`) * (sortDir === "asc" ? 1 : -1);
      }
      return ((Number(left) || 0) - (Number(right) || 0)) * (sortDir === "asc" ? 1 : -1);
    });
    return copy;
  }, [players, sortBy, sortDir]);

  return (
    <div className="space-y-2">
      <div className="table-scroll-wrap">
        <div className="min-w-[760px] overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {["Player", "Position", "NFL Team", "Season Points", "Week Avg", "Best Week", "Owner"].map((label) => (
                <th key={label} className="px-2 py-2">
                  <button
                    type="button"
                    className="font-medium"
                    onClick={() => {
                      const map: Record<string, SortKey> = {
                        Player: "name",
                        Position: "position",
                        "NFL Team": "nflTeam",
                        "Season Points": "seasonPoints",
                        "Week Avg": "weekAvg",
                        "Best Week": "bestWeek",
                        Owner: "ownerTeamName",
                      };
                      const key = map[label];
                      if (sortBy === key) setSortDir((value) => (value === "asc" ? "desc" : "asc"));
                      else {
                        setSortBy(key);
                        setSortDir(key === "name" ? "asc" : "desc");
                      }
                    }}
                  >
                    {label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => (
              <tr key={player.playerId} className="border-t">
                <td className="px-2 py-2">{player.name}</td>
                <td className="px-2 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${colors[player.position] ?? "bg-muted"}`}>{player.position}</span>
                </td>
                <td className="px-2 py-2">{player.nflTeam ?? "—"}</td>
                <td className="px-2 py-2">{player.seasonPoints.toFixed(2)}</td>
                <td className="px-2 py-2">{player.weekAvg.toFixed(2)}</td>
                <td className="px-2 py-2">{player.bestWeek.toFixed(2)}</td>
                <td className="px-2 py-2">{player.ownerTeamName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Showing page {page} · {Math.max(1, Math.ceil(total / pageSize))} total pages ({total} players)
      </div>
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { PlayerWithStats } from "@/lib/db/queries";

type SortKey = "name" | "position" | "nflTeam" | "season" | "seasonPoints" | "weekAvg" | "bestWeek" | "ownerTeamName";

const colors: Record<string, string> = {
  QB: "bg-red-100 text-red-700",
  RB: "bg-blue-100 text-blue-700",
  WR: "bg-green-100 text-green-700",
  TE: "bg-purple-100 text-purple-700",
  K: "bg-gray-100 text-gray-700",
  DEF: "bg-yellow-100 text-yellow-700",
};

const columns: { label: string; key: SortKey; defaultDir?: "asc" | "desc" }[] = [
  { label: "Player", key: "name", defaultDir: "asc" },
  { label: "Position", key: "position", defaultDir: "asc" },
  { label: "Season", key: "season" },
  { label: "NFL Team", key: "nflTeam", defaultDir: "asc" },
  { label: "Season Points", key: "seasonPoints" },
  { label: "Week Avg", key: "weekAvg" },
  { label: "Best Week", key: "bestWeek" },
  { label: "Owner", key: "ownerTeamName", defaultDir: "asc" },
];

export function PlayerStatsTable({
  players,
  total,
  page,
  pageSize,
  sortBy,
  sortDir,
}: {
  players: PlayerWithStats[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSort(key: SortKey, defaultDir: "asc" | "desc" = "desc") {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === key) {
      params.set("sortDir", sortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", key);
      params.set("sortDir", defaultDir);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="table-scroll-wrap">
        <div className="min-w-[860px] overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {columns.map(({ label, key, defaultDir }) => (
                <th key={key} className="px-2 py-2">
                  <button
                    type="button"
                    className="font-medium"
                    onClick={() => handleSort(key, defaultDir)}
                  >
                    {label}
                    {sortBy === key ? (sortDir === "asc" ? " ↑" : " ↓") : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.playerId} className="border-t">
                <td className="px-2 py-2">{player.name}</td>
                <td className="px-2 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${colors[player.position] ?? "bg-muted"}`}>{player.position}</span>
                </td>
                <td className="px-2 py-2">{player.season ?? "—"}</td>
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

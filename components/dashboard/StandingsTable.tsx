"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import type { StandingRow } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/EmptyState";

type SortKey = "rank" | "teamName" | "managerNickname" | "wins" | "losses" | "ties" | "pointsFor" | "pointsAgainst" | "expectedWins" | "xDiff";

type PlayoffResult = {
  teamId: number;
  playoffWins: number;
  playoffLosses: number;
  playoffPointsFor?: number;
  playoffPointsAgainst?: number;
};

export function StandingsTable({
  rows,
  playoffCutoff = 6,
  playoffResults = [],
}: {
  rows: StandingRow[];
  playoffCutoff?: number;
  playoffResults?: PlayoffResult[];
}) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [regularSeasonOnly, setRegularSeasonOnly] = useState(true);

  const playoffMap = useMemo(() => {
    const map = new Map<number, PlayoffResult>();
    for (const r of playoffResults) map.set(r.teamId, r);
    return map;
  }, [playoffResults]);

  // Subtract playoff W/L and points from the record when regularSeasonOnly is checked
  const adjustedRows = useMemo(() => {
    return rows.map((row) => {
      if (!regularSeasonOnly) return row;
      const pr = playoffMap.get(row.teamId);
      if (!pr) return row;
      return {
        ...row,
        wins: row.wins - pr.playoffWins,
        losses: row.losses - pr.playoffLosses,
        pointsFor: row.pointsFor - (pr.playoffPointsFor ?? 0),
        pointsAgainst: row.pointsAgainst - (pr.playoffPointsAgainst ?? 0),
      };
    });
  }, [rows, regularSeasonOnly, playoffMap]);

  const sorted = useMemo(() => {
    // xDiff = actual wins - expected wins (positive = doing better than luck, negative = worse)
    const copy = adjustedRows.map((row) => {
      const xDiff = row.expectedWins != null ? row.wins - row.expectedWins : null;
      return { ...row, _xDiff: xDiff };
    });
    copy.sort((a, b) => {
      if (sortBy === "xDiff") {
        const av = a._xDiff ?? 0;
        const bv = b._xDiff ?? 0;
        return (av - bv) * (sortDir === "asc" ? 1 : -1);
      }
      const first = a[sortBy as keyof StandingRow] ?? 0;
      const second = b[sortBy as keyof StandingRow] ?? 0;
      if (typeof first === "string" || typeof second === "string") {
        return `${first}`.localeCompare(`${second}`) * (sortDir === "asc" ? 1 : -1);
      }
      return ((Number(first) || 0) - (Number(second) || 0)) * (sortDir === "asc" ? 1 : -1);
    });
    return copy;
  }, [adjustedRows, sortBy, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const totalPF = adjustedRows.reduce((sum, r) => sum + r.pointsFor, 0);
  const totalPA = adjustedRows.reduce((sum, r) => sum + r.pointsAgainst, 0);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No standings yet"
        description="Import your first season's data to see league standings."
        action={{ label: "Import Data", href: "/import" }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={regularSeasonOnly}
            onChange={(e) => setRegularSeasonOnly(e.target.checked)}
            className="accent-primary"
          />
          Regular Season Only
        </label>
      </div>
      <div className="table-scroll-wrap">
        <div className="min-w-[860px] overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              {[
                ["rank", "Rank"],
                ["teamName", "Team Name"],
                ["managerNickname", "Manager"],
                ["wins", "W"],
                ["losses", "L"],
                ["ties", "T"],
                ["pointsFor", "PF"],
                ["pointsAgainst", "PA"],
              ].map(([key, label]) => (
                <th key={key} className={`px-2 py-2 ${key === "pointsAgainst" ? "hidden md:table-cell" : ""}`}>
                  <button type="button" className="font-medium" onClick={() => onSort(key as SortKey)}>
                    {label}
                  </button>
                </th>
              ))}
              <th className="hidden px-2 py-2 md:table-cell">Diff</th>
              <th className="hidden px-2 py-2 md:table-cell">
                <button type="button" className="font-medium" title="Expected Wins: hypothetical wins if the team had played every other team each week" onClick={() => onSort("expectedWins")}>
                  xW
                </button>
              </th>
              <th className="hidden px-2 py-2 md:table-cell">
                <button type="button" className="font-medium" title="xDiff: Actual Wins minus Expected Wins. Positive = better than expected (green), Negative = worse than expected (red)" onClick={() => onSort("xDiff")}>
                  xDiff
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isFirst = row.rank === 1;
              const isLast = row.rank === sorted.length;
              const inPlayoffs = row.rank <= playoffCutoff;

              const xDiff = row._xDiff != null ? Number(row._xDiff.toFixed(2)) : null;

              // Positive = winning more than expected = green
              // Negative = winning less than expected = red
              // Zero = gold
              let xDiffColor = "text-yellow-600 font-semibold";
              if (xDiff !== null) {
                if (xDiff > 0) xDiffColor = "text-green-600 font-semibold";
                else if (xDiff < 0) xDiffColor = "text-red-600 font-semibold";
              }

              return (
                <tr
                  key={row.teamId}
                  className={`cursor-pointer border-t hover:bg-muted/30 ${isFirst ? "bg-amber-50" : ""} ${isLast ? "bg-red-50/40" : ""} ${inPlayoffs ? "border-l-2 border-l-dashed border-l-emerald-500" : ""}`}
                  onClick={() => router.push(`/teams/${row.teamKey}`)}
                >
                  <td className="px-2 py-2">{row.rank}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {row.logoUrl ? <img src={row.logoUrl} alt={row.teamName} className="h-5 w-5 rounded-full" /> : <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">{row.teamName.slice(0, 2)}</span>}
                      <span>{row.teamName}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2">{row.managerNickname ?? "—"}</td>
                  <td className="px-2 py-2">{row.wins}</td>
                  <td className="px-2 py-2">{row.losses}</td>
                  <td className="px-2 py-2">{row.ties}</td>
                  <td className="px-2 py-2">{row.pointsFor.toFixed(2)}</td>
                  <td className="hidden px-2 py-2 md:table-cell">{row.pointsAgainst.toFixed(2)}</td>
                  <td className="hidden px-2 py-2 md:table-cell">{(row.pointsFor - row.pointsAgainst).toFixed(2)}</td>
                  <td className="hidden px-2 py-2 md:table-cell">
                    {row.expectedWins != null ? row.expectedWins.toFixed(2) : "—"}
                  </td>
                  <td className={`hidden px-2 py-2 md:table-cell ${xDiff !== null ? xDiffColor : ""}`}>
                    {xDiff !== null ? (xDiff > 0 ? `+${xDiff}` : `${xDiff}`) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted/30 font-semibold">
            <tr className="border-t">
              <td className="px-2 py-2" />
              <td className="px-2 py-2">Totals</td>
              <td className="px-2 py-2" />
              <td className="px-2 py-2">{adjustedRows.reduce((sum, r) => sum + r.wins, 0)}</td>
              <td className="px-2 py-2">{adjustedRows.reduce((sum, r) => sum + r.losses, 0)}</td>
              <td className="px-2 py-2">{adjustedRows.reduce((sum, r) => sum + r.ties, 0)}</td>
              <td className="px-2 py-2">{totalPF.toFixed(2)}</td>
              <td className="hidden px-2 py-2 md:table-cell">{totalPA.toFixed(2)}</td>
              <td className="hidden px-2 py-2 md:table-cell">{(totalPF - totalPA).toFixed(2)}</td>
              <td className="hidden px-2 py-2 md:table-cell" />
              <td className="hidden px-2 py-2 md:table-cell" />
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
}

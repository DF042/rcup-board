"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import type { StandingRow } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/EmptyState";

type SortKey = "rank" | "teamName" | "managerNickname" | "wins" | "losses" | "ties" | "pointsFor" | "pointsAgainst" | "expectedWins";

export function StandingsTable({ rows, playoffCutoff = 6 }: { rows: StandingRow[]; playoffCutoff?: number }) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [regularSeasonOnly, setRegularSeasonOnly] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const first = a[sortBy] ?? 0;
      const second = b[sortBy] ?? 0;
      if (typeof first === "string" || typeof second === "string") {
        return `${first}`.localeCompare(`${second}`) * (sortDir === "asc" ? 1 : -1);
      }
      return ((Number(first) || 0) - (Number(second) || 0)) * (sortDir === "asc" ? 1 : -1);
    });
    return copy;
  }, [rows, sortBy, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const totalPF = rows.reduce((sum, r) => sum + r.pointsFor, 0);
  const totalPA = rows.reduce((sum, r) => sum + r.pointsAgainst, 0);

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
                <button type="button" className="font-medium" title="Expected Wins: hypothetical wins if the team had played every other team each week" onClick={() => onSort("expectedWins" as SortKey)}>
                  xW
                </button>
              </th>
              <th className="hidden px-2 py-2 md:table-cell" title="xDiff: Expected Wins minus Actual Wins">xDiff</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isFirst = row.rank === 1;
              const isLast = row.rank === sorted.length;
              const inPlayoffs = row.rank <= playoffCutoff;

              const xDiff =
                row.expectedWins != null
                  ? Number((row.expectedWins - row.wins).toFixed(2))
                  : null;

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
              <td className="px-2 py-2">{rows.reduce((sum, r) => sum + r.wins, 0)}</td>
              <td className="px-2 py-2">{rows.reduce((sum, r) => sum + r.losses, 0)}</td>
              <td className="px-2 py-2">{rows.reduce((sum, r) => sum + r.ties, 0)}</td>
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

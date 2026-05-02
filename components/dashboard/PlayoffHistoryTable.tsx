import { Trophy } from "lucide-react";
import type { ChampionHistoryRow, PlayoffResultRow } from "@/lib/db/queries";
import { EmptyState } from "@/components/ui/EmptyState";

export function ChampionHistoryTable({ rows }: { rows: ChampionHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No champions yet"
        description="Import playoff matchup data to see champion history."
      />
    );
  }

  return (
    <div className="table-scroll-wrap">
      <div className="min-w-[400px] overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-2">Season</th>
              <th className="px-2 py-2">Champion Team</th>
              <th className="px-2 py-2">Manager</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.season} className="border-t">
                <td className="px-2 py-2 font-medium">{row.season}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {row.logoUrl ? (
                      <img src={row.logoUrl} alt={row.teamName} className="h-5 w-5 rounded-full" />
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px]">🏆</span>
                    )}
                    <span>{row.teamName}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-muted-foreground">{row.managerNickname ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlayoffResultsTable({ rows }: { rows: PlayoffResultRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No playoff data yet"
        description="Import playoff matchup data to see results."
      />
    );
  }

  const sorted = rows.slice().sort((a, b) => {
    if (b.playoffWins !== a.playoffWins) return b.playoffWins - a.playoffWins;
    if (a.playoffLosses !== b.playoffLosses) return a.playoffLosses - b.playoffLosses;
    return a.finalRank - b.finalRank;
  });

  return (
    <div className="table-scroll-wrap">
      <div className="min-w-[640px] overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-2">Team</th>
              <th className="px-2 py-2">Manager</th>
              <th className="px-2 py-2">Made Playoffs</th>
              <th className="px-2 py-2">Playoff W-L</th>
              <th className="px-2 py-2">Finish</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={`${row.season}-${row.teamId}`}
                className={`border-t ${row.isChampion ? "bg-amber-50" : ""}`}
              >
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    {row.logoUrl ? (
                      <img src={row.logoUrl} alt={row.teamName} className="h-5 w-5 rounded-full" />
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">
                        {row.teamName.slice(0, 2)}
                      </span>
                    )}
                    <span>{row.teamName}</span>
                    {row.isChampion ? <span title="Champion">🏆</span> : null}
                  </div>
                </td>
                <td className="px-2 py-2 text-muted-foreground">{row.managerNickname ?? "—"}</td>
                <td className="px-2 py-2">{row.madePlayoffs ? "✓" : "—"}</td>
                <td className="px-2 py-2">
                  {row.madePlayoffs ? `${row.playoffWins}-${row.playoffLosses}` : "—"}
                </td>
                <td className="px-2 py-2">
                  {row.finalRank > 0 ? `#${row.finalRank}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

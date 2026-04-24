import Link from "next/link";
import type { ManagerSummary } from "@/lib/db/queries";

export function ManagerCard({ manager }: { manager: ManagerSummary }) {
  const totalGames = manager.totalWins + manager.totalLosses + manager.totalTies;
  const winRate = totalGames ? ((manager.totalWins / totalGames) * 100).toFixed(1) : "0.0";

  return (
    <Link href={`/managers/${manager.managerId}`} className="block rounded border p-4 transition hover:bg-muted/30">
      <div className="mb-2 flex items-center gap-2">
        {manager.imageUrl ? (
          <img src={manager.imageUrl} alt={manager.nickname} className="h-10 w-10 rounded-full border object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted text-xs font-semibold">{manager.nickname.slice(0, 2).toUpperCase()}</div>
        )}
        <div>
          <p className="font-semibold">{manager.nickname}</p>
          <p className="text-xs text-muted-foreground">
            {manager.totalWins}-{manager.totalLosses}-{manager.totalTies}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-muted px-2 py-1">Win Rate {winRate}%</span>
        <span className="rounded bg-muted px-2 py-1">Seasons {manager.seasonsPlayed}</span>
        <span className="rounded bg-muted px-2 py-1">Best {manager.bestFinish ? `#${manager.bestFinish}` : "—"}</span>
        <span className="rounded bg-muted px-2 py-1">Total Pts {manager.totalPointsFor.toFixed(2)}</span>
        <span className="rounded bg-muted px-2 py-1">Avg Pts {manager.avgPointsFor.toFixed(2)}</span>
      </div>
    </Link>
  );
}

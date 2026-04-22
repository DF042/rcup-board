import { ManagerHeadToHead } from "@/components/managers/ManagerHeadToHead";
import { ManagerHistoryChart } from "@/components/managers/ManagerHistoryChart";
import { WinRateRadarChart } from "@/components/charts/WinRateRadarChart";
import { getAllManagers, getHeadToHead, getManagerById, getManagerRosterHistory } from "@/lib/db/queries";

export const revalidate = 300;

export default async function ManagerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ managerId: string }>;
  searchParams: Promise<{ tab?: "overview" | "history" | "players" | "h2h"; compareManagerId?: string }>;
}) {
  const { managerId } = await params;
  const { tab = "overview", compareManagerId } = await searchParams;

  const manager = await getManagerById(managerId);
  if (!manager) {
    return <div className="py-4 text-sm text-muted-foreground">Manager not found.</div>;
  }

  const [allManagers, bestPlayers, h2h] = await Promise.all([
    getAllManagers(),
    getManagerRosterHistory(managerId),
    compareManagerId ? getHeadToHead(managerId, compareManagerId) : Promise.resolve(null),
  ]);

  const summary = allManagers.find((item) => item.managerId === manager.managerId);

  const totalW = manager.seasons.reduce((sum, row) => sum + row.wins, 0);
  const totalL = manager.seasons.reduce((sum, row) => sum + row.losses, 0);
  const totalT = manager.seasons.reduce((sum, row) => sum + row.ties, 0);

  return (
    <div className="space-y-4 py-4">
      <div>
        <h2 className="text-lg font-semibold">{manager.nickname}</h2>
        <p className="text-sm text-muted-foreground">Manager ID: {manager.managerId}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["overview", "Overview"],
          ["history", "Season History"],
          ["players", "Best Players"],
          ["h2h", "Head-to-Head"],
        ].map(([value, label]) => (
          <a key={value} href={`/managers/${managerId}?tab=${value}`} className={`rounded border px-2 py-1 text-sm ${tab === value ? "bg-primary text-primary-foreground" : ""}`}>
            {label}
          </a>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total W-L-T" value={`${totalW}-${totalL}-${totalT}`} />
            <Stat label="Avg PF" value={summary ? summary.avgPointsFor.toFixed(2) : "0.00"} />
            <Stat label="Best Finish" value={summary?.bestFinish ? `#${summary.bestFinish}` : "—"} />
            <Stat label="Worst Finish" value={summary?.worstFinish ? `#${summary.worstFinish}` : "—"} />
          </div>
          <WinRateRadarChart
            metrics={{
              winRate: summary ? Number(((summary.totalWins / Math.max(1, summary.totalWins + summary.totalLosses + summary.totalTies)) * 100).toFixed(2)) : 0,
              avgPF: summary?.avgPointsFor ?? 0,
              consistency: summary ? Number((100 / Math.max(1, summary.worstFinish ?? 1)).toFixed(2)) : 0,
              bestSeasonRank: summary?.bestFinish ? 100 / summary.bestFinish : 0,
              transactionActivity: manager.seasons.length,
            }}
          />
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-3">
          <ManagerHistoryChart seasons={manager.seasons.map((row) => ({ season: row.season, rank: row.rank, wins: row.wins, losses: row.losses }))} />
          <div className="overflow-hidden rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-2 py-2">Season</th>
                  <th className="px-2 py-2">Team</th>
                  <th className="px-2 py-2">Record</th>
                  <th className="px-2 py-2">PF</th>
                  <th className="px-2 py-2">PA</th>
                  <th className="px-2 py-2">Rank</th>
                </tr>
              </thead>
              <tbody>
                {manager.seasons.map((row) => (
                  <tr key={`${row.teamId}-${row.season}`} className="border-t">
                    <td className="px-2 py-2">{row.season}</td>
                    <td className="px-2 py-2">{row.teamName}</td>
                    <td className="px-2 py-2">{row.wins}-{row.losses}-{row.ties}</td>
                    <td className="px-2 py-2">{row.pointsFor.toFixed(2)}</td>
                    <td className="px-2 py-2">{row.pointsAgainst.toFixed(2)}</td>
                    <td className="px-2 py-2">#{row.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "players" ? (
        <div className="overflow-hidden rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">NFL Team</th>
                <th className="px-2 py-2">Seasons</th>
                <th className="px-2 py-2">Total Points</th>
              </tr>
            </thead>
            <tbody>
              {bestPlayers.slice(0, 10).map((row) => (
                <tr key={row.playerId} className="border-t">
                  <td className="px-2 py-2">{row.fullName}</td>
                  <td className="px-2 py-2">{row.nflTeam ?? "—"}</td>
                  <td className="px-2 py-2">{row.seasons.join(", ")}</td>
                  <td className="px-2 py-2">{row.totalPoints.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "h2h" ? (
        <div className="space-y-2">
          <form action={`/managers/${managerId}`} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="tab" value="h2h" />
            <select name="compareManagerId" defaultValue={compareManagerId ?? ""} className="h-10 rounded border px-3 text-sm">
              <option value="">Select manager to compare</option>
              {allManagers
                .filter((item) => item.managerId !== manager.managerId)
                .map((item) => (
                  <option key={item.managerId} value={item.managerId}>
                    {item.nickname}
                  </option>
                ))}
            </select>
            <button className="h-10 rounded border px-3 text-sm" type="submit">
              Load
            </button>
          </form>

          {h2h && compareManagerId ? (
            <ManagerHeadToHead
              result={h2h}
              manager1Name={manager.nickname}
              manager2Name={allManagers.find((item) => String(item.managerId) === compareManagerId)?.nickname ?? "Manager"}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select another manager to view head-to-head.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

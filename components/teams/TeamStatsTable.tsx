import type { TeamWithManager } from "@/lib/db/queries";

export function TeamStatsTable({ team, leagueAverages }: { team: TeamWithManager; leagueAverages: { pointsFor: number; pointsAgainst: number } }) {
  return (
    <div className="table-scroll-wrap">
      <div className="min-w-[520px] overflow-hidden rounded border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-2 py-2 text-left">Metric</th>
            <th className="px-2 py-2 text-right">Team</th>
            <th className="px-2 py-2 text-right">League Avg</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="px-2 py-2">Points For</td>
            <td className="px-2 py-2 text-right">{team.pointsFor.toFixed(2)}</td>
            <td className="px-2 py-2 text-right">{leagueAverages.pointsFor.toFixed(2)}</td>
          </tr>
          <tr className="border-t">
            <td className="px-2 py-2">Points Against</td>
            <td className="px-2 py-2 text-right">{team.pointsAgainst.toFixed(2)}</td>
            <td className="px-2 py-2 text-right">{leagueAverages.pointsAgainst.toFixed(2)}</td>
          </tr>
          <tr className="border-t">
            <td className="px-2 py-2">Record</td>
            <td className="px-2 py-2 text-right">
              {team.wins}-{team.losses}-{team.ties}
            </td>
            <td className="px-2 py-2 text-right">—</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}

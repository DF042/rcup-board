import type { RosterPlayer } from "@/lib/db/queries";
import { slotSortKey } from "@/lib/roster/slotOrder";

export function TeamRosterList({ roster }: { roster: RosterPlayer[] }) {
  const starters = roster
    .filter((player) => player.isStarting)
    .sort((a, b) => slotSortKey(a.rosterPosition) - slotSortKey(b.rosterPosition));
  const bench = roster.filter((player) => !player.isStarting);

  const rows = [...starters, ...bench];

  return (
    <div className="table-scroll-wrap">
      <div className="min-w-[640px] overflow-hidden rounded border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-2 py-2">Position Slot</th>
            <th className="px-2 py-2">Player Name</th>
            <th className="px-2 py-2">NFL Team</th>
            <th className="px-2 py-2 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player, index) => (
            <tr key={`${player.playerId}-${index}`} className={`border-t ${!player.isStarting ? "bg-muted/20" : ""}`}>
              <td className="px-2 py-2">
                {player.rosterPosition ?? player.position}
                {!player.isStarting && index === starters.length ? <div className="mt-1 text-[10px] uppercase text-muted-foreground">Bench</div> : null}
              </td>
              <td className="px-2 py-2">
                <a href="#" className="underline-offset-2 hover:underline">
                  {player.fullName}
                </a>
                {(player.status ?? "").toUpperCase() === "IR" ? (
                  <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">IR</span>
                ) : null}
              </td>
              <td className="px-2 py-2">{player.nflTeam ?? "—"}</td>
              <td className="px-2 py-2 text-right">{player.points.toFixed(2)}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-2 py-6 text-center text-muted-foreground">
                Roster is empty.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </div>
    </div>
  );
}

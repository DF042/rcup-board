import type { RosterPlayer } from "@/lib/db/queries";

export function WeeklyScoreBreakdown({
  leftRoster,
  rightRoster,
}: {
  leftRoster: RosterPlayer[];
  rightRoster: RosterPlayer[];
}) {
  const [leftStarters, leftBench] = [leftRoster.filter((p) => p.isStarting), leftRoster.filter((p) => !p.isStarting)];
  const [rightStarters, rightBench] = [rightRoster.filter((p) => p.isStarting), rightRoster.filter((p) => !p.isStarting)];

  return (
    <div className="space-y-2 rounded border p-3 text-xs">
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <h4 className="mb-1 font-semibold">Team A</h4>
          {leftStarters.map((player) => (
            <div key={`l-${player.playerId}`} className="flex items-center justify-between border-b py-1">
              <span>{player.fullName} ({player.position})</span>
              <span>{player.points.toFixed(2)}</span>
            </div>
          ))}
          {leftBench.length > 0 ? <p className="mt-1 text-muted-foreground">Bench: {leftBench.length}</p> : null}
        </div>
        <div>
          <h4 className="mb-1 font-semibold">Team B</h4>
          {rightStarters.map((player) => (
            <div key={`r-${player.playerId}`} className="flex items-center justify-between border-b py-1">
              <span>{player.fullName} ({player.position})</span>
              <span>{player.points.toFixed(2)}</span>
            </div>
          ))}
          {rightBench.length > 0 ? <p className="mt-1 text-muted-foreground">Bench: {rightBench.length}</p> : null}
        </div>
      </div>
    </div>
  );
}

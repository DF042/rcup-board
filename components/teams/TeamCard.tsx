import Link from "next/link";
import type { TeamWithManager } from "@/lib/db/queries";

export function TeamCard({ team }: { team: TeamWithManager }) {
  const initials = team.name
    .split(" ")
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();

  return (
    <Link href={`/teams/${team.teamKey}`} className="block rounded border p-4 transition hover:bg-muted/30">
      <div className="mb-2 flex items-center gap-2">
        {team.logoUrl ? (
          <img src={team.logoUrl} alt={team.name} className="h-10 w-10 rounded-full border object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted text-xs font-semibold">{initials}</div>
        )}
        <div>
          <p className="font-semibold">{team.name}</p>
          <p className="text-xs text-muted-foreground">Season {team.season}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Manager: {team.managerNickname ?? "—"}</p>
      <p className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
        {team.wins}-{team.losses}-{team.ties}
      </p>
      <p className="mt-2 text-sm">Points For: {team.pointsFor.toFixed(2)}</p>
    </Link>
  );
}

import { MatchupCard } from "@/components/matchups/MatchupCard";
import { Swords } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAllSeasons, getCurrentWeek, getMatchups, getRoster } from "@/lib/db/queries";

export const revalidate = 300;

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; week?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAllSeasons();
  const season = params.season ? Number(params.season) : seasons[0]?.season;
  const league = seasons.find((row) => row.season === season) ?? seasons[0];

  if (!league) {
    return <div className="py-4 text-sm text-muted-foreground">No matchup data available.</div>;
  }

  const maxWeek = await getCurrentWeek(String(league.leagueId));
  const week = params.week ? Number(params.week) : maxWeek;
  const matchups = await getMatchups({ leagueId: String(league.leagueId), season, week });

  const rosterMap = new Map<number, Awaited<ReturnType<typeof getRoster>>>();
  await Promise.all(
    [...new Set(matchups.flatMap((row) => [row.team1Id, row.team2Id]))].map(async (teamId) => {
      rosterMap.set(teamId, await getRoster(String(teamId), week));
    }),
  );

  return (
    <div className="space-y-4 py-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: maxWeek }, (_, idx) => idx + 1).map((wk) => (
          <a key={wk} href={`/matchups?season=${season}&week=${wk}`} className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${wk === week ? "bg-primary text-primary-foreground" : ""}`}>
            Week {wk}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        {matchups.map((matchup) => (
          <MatchupCard key={matchup.id} matchup={matchup} leftRoster={rosterMap.get(matchup.team1Id) ?? []} rightRoster={rosterMap.get(matchup.team2Id) ?? []} />
        ))}
      </div>
      {matchups.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No matchups this week"
          description="Check back after games are played, or select a different week."
        />
      ) : null}
    </div>
  );
}

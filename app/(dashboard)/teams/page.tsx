import { TeamCard } from "@/components/teams/TeamCard";
import { getAllSeasons, getTeams } from "@/lib/db/queries";

export const revalidate = 300;

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; search?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAllSeasons();
  const selectedSeason = params.season ? Number(params.season) : seasons[0]?.season;
  const teams = await getTeams({ season: selectedSeason });
  const filtered = params.search
    ? teams.filter((team) => team.name.toLowerCase().includes((params.search ?? "").toLowerCase()))
    : teams;

  return (
    <div className="space-y-4 py-4">
      <form className="grid gap-2 sm:grid-cols-2" action="/teams">
        <input type="text" name="search" defaultValue={params.search ?? ""} placeholder="Search by team name" className="h-10 rounded border px-3 text-sm" />
        <select
          name="season"
          defaultValue={selectedSeason}
          className="h-10 rounded border px-3 text-sm"
        >
          {seasons.map((season) => (
            <option key={season.season} value={season.season}>
              {season.season}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded border px-3 text-sm">Apply</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No teams found.</p> : null}
    </div>
  );
}

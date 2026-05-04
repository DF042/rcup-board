import Link from "next/link";
import { Search } from "lucide-react";
import { PlayerSearchBar } from "@/components/players/PlayerSearchBar";
import { PlayerStatsTable } from "@/components/players/PlayerStatsTable";
import { FilterBar } from "@/components/filters/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { getPlayers } from "@/lib/db/queries";

export const revalidate = 300;

const pageSize = 25;

type SortBy = "name" | "position" | "nflTeam" | "seasonPoints" | "weekAvg" | "bestWeek" | "ownerTeamName" | "season";

const validSortKeys: SortBy[] = ["name", "position", "nflTeam", "seasonPoints", "weekAvg", "bestWeek", "ownerTeamName", "season"];

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; position?: string; season?: string; page?: string; sortBy?: string; sortDir?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));
  const sortBy = (validSortKeys.includes(params.sortBy as SortBy) ? params.sortBy : "seasonPoints") as SortBy;
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";

  const result = await getPlayers({
    search: params.search,
    position: params.position,
    season: params.season ? Number(params.season) : undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    sortBy,
    sortDir,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  return (
    <div className="space-y-4 py-4">
      <FilterBar />
      <PlayerSearchBar />
      {result.players.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No players found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <PlayerStatsTable players={result.players} total={result.total} page={page} pageSize={pageSize} sortBy={sortBy} sortDir={sortDir} />
      )}
      <div className="flex items-center gap-2 text-sm">
        <Link className={`rounded border px-2 py-1 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={`?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}>
          Previous
        </Link>
        <span>
          Page {page} / {totalPages}
        </span>
        <Link className={`rounded border px-2 py-1 ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`} href={`?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}>
          Next
        </Link>
      </div>
    </div>
  );
}

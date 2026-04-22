import { ManagerCard } from "@/components/managers/ManagerCard";
import { getAllManagers } from "@/lib/db/queries";

export const revalidate = 300;

export default async function ManagersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: "wins" | "winRate" | "seasons" | "avgPoints" }>;
}) {
  const { sort = "wins" } = await searchParams;
  const managers = await getAllManagers();

  const sorted = [...managers].sort((a, b) => {
    if (sort === "winRate") {
      const aGames = a.totalWins + a.totalLosses + a.totalTies;
      const bGames = b.totalWins + b.totalLosses + b.totalTies;
      const aRate = aGames ? a.totalWins / aGames : 0;
      const bRate = bGames ? b.totalWins / bGames : 0;
      return bRate - aRate;
    }
    if (sort === "seasons") return b.seasonsPlayed - a.seasonsPlayed;
    if (sort === "avgPoints") return b.avgPointsFor - a.avgPointsFor;
    return b.totalWins - a.totalWins;
  });

  const options = [
    ["wins", "All-time Wins"],
    ["winRate", "Win Rate"],
    ["seasons", "Seasons Played"],
    ["avgPoints", "Avg Points"],
  ] as const;

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label]) => (
          <a key={value} href={`/managers?sort=${value}`} className={`rounded border px-2 py-1 text-sm ${sort === value ? "bg-primary text-primary-foreground" : ""}`}>
            {label}
          </a>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((manager) => (
          <ManagerCard key={manager.managerId} manager={manager} />
        ))}
      </div>
    </div>
  );
}

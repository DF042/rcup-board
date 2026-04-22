import { PlayerSearchBar } from "@/components/players/PlayerSearchBar";
import { PlayerStatsTable } from "@/components/players/PlayerStatsTable";

export default function PlayersPage() {
  return (
    <div className="space-y-4 py-4">
      <PlayerSearchBar />
      <PlayerStatsTable />
    </div>
  );
}

import { TeamRosterList } from "@/components/teams/TeamRosterList";
import { TeamStatsTable } from "@/components/teams/TeamStatsTable";

export default async function TeamDetailPage({ params }: { params: Promise<{ teamKey: string }> }) {
  const { teamKey } = await params;
  return (
    <div className="space-y-4 py-4">
      <h2 className="text-lg font-semibold">Team {teamKey}</h2>
      <TeamStatsTable />
      <TeamRosterList />
    </div>
  );
}

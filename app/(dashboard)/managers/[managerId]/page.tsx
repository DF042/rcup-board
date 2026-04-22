import { ManagerHeadToHead } from "@/components/managers/ManagerHeadToHead";
import { ManagerHistoryChart } from "@/components/managers/ManagerHistoryChart";

export default async function ManagerDetailPage({ params }: { params: Promise<{ managerId: string }> }) {
  const { managerId } = await params;
  return (
    <div className="space-y-4 py-4">
      <h2 className="text-lg font-semibold">Manager {managerId}</h2>
      <ManagerHistoryChart />
      <ManagerHeadToHead />
    </div>
  );
}

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { HeadToHeadResult } from "@/lib/db/queries";

export function ManagerHeadToHead({
  result,
  manager1Name,
  manager2Name,
}: {
  result: HeadToHeadResult;
  manager1Name: string;
  manager2Name: string;
}) {
  const total = result.manager1Wins + result.manager2Wins + result.ties;
  const rate = total ? ((result.manager1Wins / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-3 rounded border p-3">
      <div className="flex items-center justify-center gap-3 text-sm">
        <span className="rounded-full border px-3 py-1">{manager1Name}</span>
        <span className="font-semibold">VS</span>
        <span className="rounded-full border px-3 py-1">{manager2Name}</span>
      </div>
      <p className="text-center text-lg font-semibold">
        {result.manager1Wins} - {result.manager2Wins} - {result.ties}
      </p>

      <div className="mx-auto h-48 max-w-xs">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <PieChart>
            <Pie dataKey="value" data={[{ name: manager1Name, value: result.manager1Wins }, { name: manager2Name, value: result.manager2Wins }, { name: "Ties", value: result.ties }]} outerRadius={60}>
              <Cell fill="#16a34a" />
              <Cell fill="#2563eb" />
              <Cell fill="#9ca3af" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-muted-foreground">{manager1Name} win rate: {rate}%</p>

      <div className="overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-2">Week</th>
              <th className="px-2 py-2">Season</th>
              <th className="px-2 py-2">Score</th>
              <th className="px-2 py-2">Winner</th>
            </tr>
          </thead>
          <tbody>
            {result.matchups.slice(0, 12).map((matchup) => (
              <tr key={matchup.id} className="border-t">
                <td className="px-2 py-2">{matchup.week}</td>
                <td className="px-2 py-2">{matchup.season}</td>
                <td className="px-2 py-2">
                  {matchup.team1Points.toFixed(2)} - {matchup.team2Points.toFixed(2)}
                </td>
                <td className="px-2 py-2">{matchup.winnerTeamName ?? "Tie"}</td>
              </tr>
            ))}
            {result.matchups.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-6 text-center text-muted-foreground">
                  No shared matchups found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

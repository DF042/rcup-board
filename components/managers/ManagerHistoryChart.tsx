"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ManagerHistoryChart({
  seasons,
}: {
  seasons: Array<{ season: number; rank: number; wins: number; losses: number }>;
}) {
  const data = seasons
    .slice()
    .sort((a, b) => a.season - b.season)
    .map((row) => ({
      season: row.season,
      rank: row.rank,
      label: `${row.season}: ${row.rank} place (${row.wins}-${row.losses})`,
    }));

  return (
    <div className="h-64 rounded border p-2">
      <ResponsiveContainer width="100%" height="100%" minHeight={220}>
        <LineChart data={data} margin={{ left: 8, right: 8, top: 12, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="season" />
          <YAxis reversed allowDecimals={false} />
          <Tooltip formatter={(_, __, payload) => payload?.payload?.label ?? ""} />
          <Line dataKey="rank" type="monotone" stroke="currentColor" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

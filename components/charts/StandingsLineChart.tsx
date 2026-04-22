"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function StandingsLineChart({ data = [] }: { data?: Array<{ season: number; rank: number }> }) {
  return (
    <div className="h-56 rounded border p-2">
      <ResponsiveContainer width="100%" height="100%" minHeight={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="season" />
          <YAxis reversed allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="rank" stroke="currentColor" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

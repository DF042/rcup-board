"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

const data = [{ value: 0 }, { value: 0 }];

export function StandingsLineChart() {
  return (
    <div className="h-40 rounded border p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke="currentColor" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

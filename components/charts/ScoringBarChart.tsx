"use client";

import { Bar, BarChart, ResponsiveContainer } from "recharts";

const data = [{ score: 0 }];

export function ScoringBarChart() {
  return (
    <div className="h-40 rounded border p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <Bar dataKey="score" fill="currentColor" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

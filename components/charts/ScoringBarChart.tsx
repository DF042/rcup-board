"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ScoringBarChart({ data = [] }: { data?: Array<{ season: number; score: number }> }) {
  return (
    <div className="h-56 rounded border p-2">
      <ResponsiveContainer width="100%" height="100%" minHeight={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="season" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="score" fill="currentColor" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

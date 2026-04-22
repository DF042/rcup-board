"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

export function WinRateRadarChart({
  metrics = {
    winRate: 0,
    avgPF: 0,
    consistency: 0,
    bestSeasonRank: 0,
    transactionActivity: 0,
  },
}: {
  metrics?: {
    winRate: number;
    avgPF: number;
    consistency: number;
    bestSeasonRank: number;
    transactionActivity: number;
  };
}) {
  const data = [
    { metric: "Win Rate", value: metrics.winRate },
    { metric: "Avg PF", value: metrics.avgPF },
    { metric: "Consistency", value: metrics.consistency },
    { metric: "Best Rank", value: metrics.bestSeasonRank },
    { metric: "Tx Activity", value: metrics.transactionActivity },
  ];

  return (
    <div className="h-56 rounded border p-2">
      <ResponsiveContainer width="100%" height="100%" minHeight={220}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <Radar dataKey="value" stroke="currentColor" fill="currentColor" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

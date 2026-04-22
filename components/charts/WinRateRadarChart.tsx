"use client";

import { PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

const data = [{ metric: "win", value: 0 }];

export function WinRateRadarChart() {
  return (
    <div className="h-40 rounded border p-2">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <Radar dataKey="value" stroke="currentColor" fill="currentColor" fillOpacity={0.2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

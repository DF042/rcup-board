"use client";

import { Activity, ArrowUpDown, CalendarClock, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const icons = [CalendarClock, Users, Activity, ArrowUpDown] as const;

export function SeasonSummaryCard({
  currentWeek,
  totalTeams,
  avgScore,
  totalTransactions,
}: {
  currentWeek: number;
  totalTeams: number;
  avgScore: number;
  totalTransactions: number;
}) {
  const values = useMemo(() => [currentWeek, totalTeams, Number(avgScore.toFixed(2)), totalTransactions], [currentWeek, totalTeams, avgScore, totalTransactions]);
  const labels = ["Current Week", "Total Teams", "Avg Score (Week)", "Total Transactions"];
  const [displayValues, setDisplayValues] = useState([0, 0, 0, 0]);

  useEffect(() => {
    const id = setTimeout(() => setDisplayValues(values), 120);
    return () => clearTimeout(id);
  }, [values]);

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {displayValues.map((value, idx) => {
        const Icon = icons[idx];
        return (
          <div key={labels[idx]} className="rounded border p-3">
            <div className="mb-1 flex items-center justify-between text-muted-foreground">
              <span className="text-xs">{labels[idx]}</span>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-semibold">{value}</p>
          </div>
        );
      })}
    </div>
  );
}

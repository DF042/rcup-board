"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = unknown;

export function QueryBuilder() {
  const [open, setOpen] = useState(false);
  const [viewType, setViewType] = useState<"team" | "manager">("team");
  const [entityId, setEntityId] = useState("");
  const [compareEntityId, setCompareEntityId] = useState("");
  const [dataType, setDataType] = useState<"record" | "roster" | "matchups" | "stats" | "transactions">("record");
  const [seasonFrom, setSeasonFrom] = useState("");
  const [seasonTo, setSeasonTo] = useState("");
  const [week, setWeek] = useState("");
  const [position, setPosition] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const bookmarkUrl = useMemo(() => {
    const params = new URLSearchParams({
      qb: "1",
      viewType,
      entityId,
      dataType,
      ...(compareEntityId ? { compareEntityId } : {}),
      ...(seasonFrom ? { seasonFrom } : {}),
      ...(seasonTo ? { seasonTo } : {}),
      ...(week ? { week } : {}),
      ...(position ? { position } : {}),
    });
    if (typeof window === "undefined") return `?${params.toString()}`;
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [compareEntityId, dataType, entityId, position, seasonFrom, seasonTo, viewType, week]);

  return (
    <div className="rounded border p-3 text-xs">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        Build Custom Query
      </Button>

      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-muted-foreground">
            Team IDs can be found in the URL when viewing a team page. Manager IDs appear in the URL on the /managers pages.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <select
              className="rounded border bg-background px-2 py-1 text-xs"
              value={viewType}
              onChange={(e) => setViewType(e.target.value === "manager" ? "manager" : "team")}
            >
              <option value="team">team</option>
              <option value="manager">manager</option>
            </select>
            <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Team or Manager numeric ID" />
            <Input value={compareEntityId} onChange={(e) => setCompareEntityId(e.target.value)} placeholder="Entity 2 ID (optional)" />
            <select
              className="rounded border bg-background px-2 py-1 text-xs"
              value={dataType}
              onChange={(e) => setDataType(e.target.value as typeof dataType)}
            >
              <option value="record">record</option>
              <option value="roster">roster</option>
              <option value="matchups">matchups</option>
              <option value="stats">stats</option>
              <option value="transactions">transactions</option>
            </select>
            <Input value={seasonFrom} onChange={(e) => setSeasonFrom(e.target.value)} placeholder="Season from" />
            <Input value={seasonTo} onChange={(e) => setSeasonTo(e.target.value)} placeholder="Season to" />
            <Input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Week" />
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Position" />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const response = await fetch("/api/query", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      viewType,
                      entityId,
                      compareEntityId: compareEntityId || undefined,
                      dataType,
                      season: seasonFrom ? Number(seasonFrom) : seasonTo ? Number(seasonTo) : undefined,
                      week: week ? Number(week) : undefined,
                      position: position || undefined,
                    }),
                  });
                  const payload = await response.json();
                  if (!response.ok) {
                    setError(payload?.error ?? `Request failed with status ${response.status}`);
                  } else {
                    setResult(payload);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={!entityId || loading}
            >
              {loading ? "Running..." : "Run Query"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(bookmarkUrl);
              }}
            >
              Save as bookmark
            </Button>
          </div>

          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : null}

          {result !== null ? (
            <pre className="max-h-64 overflow-auto rounded bg-muted p-2 text-[11px]">{JSON.stringify(result, null, 2)}</pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
